import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase-browser";

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  best_wpm: number;
  updated_at: string;
}

export async function fetchLeaderboard(
  client?: SupabaseClient
): Promise<LeaderboardEntry[]> {
  const supabase = client ?? createClient();
  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .order("best_wpm", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}

export async function upsertScore(
  userId: string,
  displayName: string,
  avatarUrl: string | null,
  wpm: number,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? createClient();

  // Check current personal best — only write if this is a new record
  const { data: existing } = await supabase
    .from("leaderboard")
    .select("best_wpm")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing && wpm <= existing.best_wpm) return;

  const { error } = await supabase.from("leaderboard").upsert(
    {
      user_id: userId,
      display_name: displayName,
      avatar_url: avatarUrl,
      best_wpm: wpm,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}
