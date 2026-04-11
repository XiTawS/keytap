import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase-browser";

export type LeaderboardMode = "time" | "infinite";

// 0 is used as sentinel for infinite mode (avoids NULL in UNIQUE constraint)
export type LeaderboardTimeLimit = 0 | 15 | 30 | 60 | 120;

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  best_wpm: number;
  mode: LeaderboardMode;
  time_limit: LeaderboardTimeLimit;
  updated_at: string;
}

export async function fetchLeaderboard(
  mode: LeaderboardMode,
  timeLimit: LeaderboardTimeLimit,
  client?: SupabaseClient
): Promise<LeaderboardEntry[]> {
  const supabase = client ?? createClient();
  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("mode", mode)
    .eq("time_limit", timeLimit)
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
  mode: LeaderboardMode,
  timeLimit: LeaderboardTimeLimit,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? createClient();

  // Check current personal best for this mode+timeLimit — only write if new record
  const { data: existing } = await supabase
    .from("leaderboard")
    .select("best_wpm")
    .eq("user_id", userId)
    .eq("mode", mode)
    .eq("time_limit", timeLimit)
    .maybeSingle();

  if (existing && wpm <= existing.best_wpm) return;

  const { error } = await supabase.from("leaderboard").upsert(
    {
      user_id: userId,
      display_name: displayName,
      avatar_url: avatarUrl,
      best_wpm: wpm,
      mode,
      time_limit: timeLimit,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,mode,time_limit" }
  );

  if (error) throw error;
}
