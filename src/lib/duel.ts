import { supabase } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface Duel {
  id: string;
  code: string;
  word_seed: string;
  language: string;
  time_limit: number;
  status: string;
  player1_id: string;
  player2_id: string | null;
  created_at: string;
}

export interface DuelProgress {
  id: string;
  duel_id: string;
  player_id: string;
  word_index: number;
  char_index: number;
  correct_chars: number;
  incorrect_chars: number;
  wpm: number;
  finished: boolean;
  updated_at: string;
}

export function generateDuelCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateSeed(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generatePlayerId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createDuel(
  playerId: string,
  language: string,
  timeLimit: number
): Promise<Duel> {
  const code = generateDuelCode();
  const seed = generateSeed();

  const { data, error } = await supabase
    .from("duels")
    .insert({
      code,
      word_seed: seed,
      language,
      time_limit: timeLimit,
      player1_id: playerId,
      status: "waiting",
    })
    .select()
    .single();

  if (error) throw error;
  return data as Duel;
}

export async function joinDuel(
  code: string,
  playerId: string
): Promise<Duel> {
  // First fetch the duel
  const { data: duel, error: fetchError } = await supabase
    .from("duels")
    .select()
    .eq("code", code.toUpperCase())
    .single();

  if (fetchError || !duel) throw new Error("Duel not found");
  if (duel.status !== "waiting") throw new Error("Duel already started");
  if (duel.player1_id === playerId) throw new Error("Cannot join your own duel");

  const { data, error } = await supabase
    .from("duels")
    .update({ player2_id: playerId, status: "playing" })
    .eq("id", duel.id)
    .select()
    .single();

  if (error) throw error;
  return data as Duel;
}

export async function getDuel(code: string): Promise<Duel | null> {
  const { data, error } = await supabase
    .from("duels")
    .select()
    .eq("code", code.toUpperCase())
    .single();

  if (error) return null;
  return data as Duel;
}

export async function updateDuelStatus(
  duelId: string,
  status: string
): Promise<void> {
  await supabase.from("duels").update({ status }).eq("id", duelId);
}

export async function updateProgress(
  duelId: string,
  playerId: string,
  progress: {
    word_index: number;
    char_index: number;
    correct_chars: number;
    incorrect_chars: number;
    wpm: number;
    finished: boolean;
  }
): Promise<void> {
  await supabase.from("duel_progress").upsert(
    {
      duel_id: duelId,
      player_id: playerId,
      ...progress,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "duel_id,player_id" }
  );
}

export function subscribeToDuel(
  duelId: string,
  callback: (duel: Duel) => void
): RealtimeChannel {
  return supabase
    .channel(`duel-${duelId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "duels",
        filter: `id=eq.${duelId}`,
      },
      (payload) => {
        callback(payload.new as Duel);
      }
    )
    .subscribe();
}

export function subscribeToProgress(
  duelId: string,
  callback: (progress: DuelProgress) => void
): RealtimeChannel {
  return supabase
    .channel(`duel-progress-${duelId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "duel_progress",
        filter: `duel_id=eq.${duelId}`,
      },
      (payload) => {
        callback(payload.new as DuelProgress);
      }
    )
    .subscribe();
}

export function broadcastProgress(
  duelId: string,
  playerId: string,
  progress: {
    word_index: number;
    char_index: number;
    correct_chars: number;
    incorrect_chars: number;
    wpm: number;
    finished: boolean;
  }
): void {
  supabase.channel(`duel-live-${duelId}`).send({
    type: "broadcast",
    event: "progress",
    payload: { player_id: playerId, ...progress },
  });
}

export function subscribeToBroadcast(
  duelId: string,
  playerId: string,
  callback: (progress: {
    player_id: string;
    word_index: number;
    char_index: number;
    correct_chars: number;
    incorrect_chars: number;
    wpm: number;
    finished: boolean;
  }) => void
): RealtimeChannel {
  return supabase
    .channel(`duel-live-${duelId}`)
    .on("broadcast", { event: "progress" }, (payload) => {
      const data = payload.payload;
      if (data.player_id !== playerId) {
        callback(data);
      }
    })
    .subscribe();
}
