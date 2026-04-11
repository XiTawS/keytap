import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchLeaderboard, upsertScore, type LeaderboardEntry } from "./leaderboard";

function makeEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    id: "entry-1",
    user_id: "user-1",
    display_name: "Alice",
    avatar_url: null,
    best_wpm: 120,
    mode: "time",
    time_limit: 30,
    updated_at: "2026-04-11T00:00:00.000Z",
    ...overrides,
  };
}

function makeChain(resolvedValue: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "order", "limit", "upsert", "eq", "maybeSingle"];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain["limit"] = vi.fn().mockResolvedValue(resolvedValue);
  chain["maybySingle"] = vi.fn().mockResolvedValue({ data: null, error: null });
  chain["maybeSingle"] = vi.fn().mockResolvedValue({ data: null, error: null });
  chain["upsert"] = vi.fn().mockResolvedValue({ error: null });
  chain["select"] = vi.fn().mockReturnValue(chain);
  chain["order"] = vi.fn().mockReturnValue(chain);
  chain["eq"] = vi.fn().mockReturnValue(chain);
  return chain;
}

describe("fetchLeaderboard", () => {
  it("queries leaderboard filtered by mode and time_limit, ordered by best_wpm desc", async () => {
    const entries = [makeEntry(), makeEntry({ user_id: "user-2", best_wpm: 90 })];
    const chain = makeChain({ data: entries, error: null });
    const client = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await fetchLeaderboard("time", 30, client);

    expect(client.from).toHaveBeenCalledWith("leaderboard");
    expect(chain.eq).toHaveBeenCalledWith("mode", "time");
    expect(chain.eq).toHaveBeenCalledWith("time_limit", 30);
    expect(chain.order).toHaveBeenCalledWith("best_wpm", { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(50);
    expect(result).toEqual(entries);
  });

  it("uses time_limit=0 for infinite mode", async () => {
    const chain = makeChain({ data: [], error: null });
    const client = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await fetchLeaderboard("infinite", 0, client);

    expect(chain.eq).toHaveBeenCalledWith("mode", "infinite");
    expect(chain.eq).toHaveBeenCalledWith("time_limit", 0);
  });

  it("throws when supabase returns an error", async () => {
    const chain = makeChain({ data: null, error: new Error("DB error") });
    const client = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await expect(fetchLeaderboard("time", 30, client)).rejects.toThrow("DB error");
  });
});

describe("upsertScore", () => {
  let client: SupabaseClient;
  let chain: ReturnType<typeof makeChain>;

  beforeEach(() => {
    chain = makeChain({ data: null, error: null });
    client = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
  });

  it("does nothing when new wpm is not better than existing best for this mode", async () => {
    chain["maybeSingle"] = vi.fn().mockResolvedValue({
      data: { best_wpm: 130 },
      error: null,
    });

    await upsertScore("user-1", "Alice", null, 120, "time", 30, client);

    expect(chain.upsert).not.toHaveBeenCalled();
  });

  it("upserts when wpm is better than existing best", async () => {
    chain["maybeSingle"] = vi.fn().mockResolvedValue({
      data: { best_wpm: 100 },
      error: null,
    });

    await upsertScore("user-1", "Alice", null, 120, "time", 30, client);

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", best_wpm: 120, mode: "time", time_limit: 30 }),
      { onConflict: "user_id,mode,time_limit" }
    );
  });

  it("upserts when user has no existing score for this mode", async () => {
    chain["maybeSingle"] = vi.fn().mockResolvedValue({ data: null, error: null });

    await upsertScore("user-1", "Alice", null, 85, "infinite", 0, client);

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", best_wpm: 85, mode: "infinite", time_limit: 0 }),
      { onConflict: "user_id,mode,time_limit" }
    );
  });

  it("throws when upsert returns an error", async () => {
    chain["maybeSingle"] = vi.fn().mockResolvedValue({ data: null, error: null });
    chain["upsert"] = vi.fn().mockResolvedValue({ error: new Error("Write failed") });

    await expect(upsertScore("user-1", "Alice", null, 85, "time", 30, client)).rejects.toThrow("Write failed");
  });
});
