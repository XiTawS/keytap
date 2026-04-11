import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// We import the functions under test — they don't exist yet, so tests will fail
import { fetchLeaderboard, upsertScore, type LeaderboardEntry } from "./leaderboard";

function makeEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    id: "entry-1",
    user_id: "user-1",
    display_name: "Alice",
    avatar_url: "https://lh3.googleusercontent.com/alice.jpg",
    best_wpm: 120,
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
  // The terminal call resolves
  chain["limit"] = vi.fn().mockResolvedValue(resolvedValue);
  chain["maybeSingle"] = vi.fn().mockResolvedValue({ data: null, error: null });
  chain["upsert"] = vi.fn().mockResolvedValue({ error: null });
  chain["select"] = vi.fn().mockReturnValue(chain);
  chain["order"] = vi.fn().mockReturnValue(chain);
  chain["eq"] = vi.fn().mockReturnValue(chain);
  return chain;
}

describe("fetchLeaderboard", () => {
  it("queries leaderboard ordered by best_wpm desc, limit 50", async () => {
    const entries = [makeEntry(), makeEntry({ user_id: "user-2", best_wpm: 90 })];
    const chain = makeChain({ data: entries, error: null });
    const client = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await fetchLeaderboard(client);

    expect(client.from).toHaveBeenCalledWith("leaderboard");
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.order).toHaveBeenCalledWith("best_wpm", { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(50);
    expect(result).toEqual(entries);
  });

  it("throws when supabase returns an error", async () => {
    const chain = makeChain({ data: null, error: new Error("DB error") });
    const client = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await expect(fetchLeaderboard(client)).rejects.toThrow("DB error");
  });
});

describe("upsertScore", () => {
  let client: SupabaseClient;
  let chain: ReturnType<typeof makeChain>;

  beforeEach(() => {
    chain = makeChain({ data: null, error: null });
    client = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
  });

  it("does nothing when new wpm is not better than existing best", async () => {
    // Existing record: best_wpm = 130
    chain["maybeSingle"] = vi.fn().mockResolvedValue({
      data: { best_wpm: 130 },
      error: null,
    });

    await upsertScore("user-1", "Alice", null, 120, client);

    expect(chain.upsert).not.toHaveBeenCalled();
  });

  it("upserts when wpm is better than existing best", async () => {
    chain["maybeSingle"] = vi.fn().mockResolvedValue({
      data: { best_wpm: 100 },
      error: null,
    });

    await upsertScore("user-1", "Alice", "https://avatar.url", 120, client);

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", best_wpm: 120 }),
      { onConflict: "user_id" }
    );
  });

  it("upserts when user has no existing score", async () => {
    chain["maybeSingle"] = vi.fn().mockResolvedValue({ data: null, error: null });

    await upsertScore("user-1", "Alice", null, 85, client);

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", best_wpm: 85 }),
      { onConflict: "user_id" }
    );
  });

  it("throws when upsert returns an error", async () => {
    chain["maybeSingle"] = vi.fn().mockResolvedValue({ data: null, error: null });
    chain["upsert"] = vi.fn().mockResolvedValue({ error: new Error("Write failed") });

    await expect(upsertScore("user-1", "Alice", null, 85, client)).rejects.toThrow("Write failed");
  });
});
