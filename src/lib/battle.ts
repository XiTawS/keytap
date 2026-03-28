import { supabase } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface Battle {
  id: string;
  code: string;
  word_seed: string;
  language: string;
  elimination_mode: "fixed" | "accelerating";
  elimination_interval: number;
  status: "waiting" | "countdown" | "playing" | "finished";
  host_id: string;
  max_players: number;
  created_at: string;
}

export interface BattlePlayer {
  id: string;
  battle_id: string;
  player_id: string;
  player_name: string;
  word_index: number;
  char_index: number;
  correct_chars: number;
  wpm: number;
  is_eliminated: boolean;
  eliminated_at: string | null;
  elimination_round: number | null;
  is_winner: boolean;
  updated_at: string;
}

export function generateBattleCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateSeed(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generatePlayerId(): string {
  return `bp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createBattle(
  hostId: string,
  hostName: string,
  language: string,
  eliminationMode: "fixed" | "accelerating",
  eliminationInterval: number
): Promise<Battle> {
  const code = generateBattleCode();
  const seed = generateSeed();

  const { data, error } = await supabase
    .from("battles")
    .insert({
      code,
      word_seed: seed,
      language,
      elimination_mode: eliminationMode,
      elimination_interval: eliminationInterval,
      host_id: hostId,
      status: "waiting",
    })
    .select()
    .single();

  if (error) throw error;

  // Add host as first player
  await supabase.from("battle_players").insert({
    battle_id: data.id,
    player_id: hostId,
    player_name: hostName,
  });

  return data as Battle;
}

export async function joinBattle(
  code: string,
  playerId: string,
  playerName: string
): Promise<{ battle: Battle; players: BattlePlayer[] }> {
  const { data: battle, error: fetchError } = await supabase
    .from("battles")
    .select()
    .eq("code", code.toUpperCase())
    .single();

  if (fetchError || !battle) throw new Error("Battle not found");
  if (battle.status !== "waiting") throw new Error("Battle already started");

  // Check player count
  const { count } = await supabase
    .from("battle_players")
    .select("*", { count: "exact", head: true })
    .eq("battle_id", battle.id);

  if ((count ?? 0) >= battle.max_players) throw new Error("Battle is full");

  // Check if already joined
  const { data: existing } = await supabase
    .from("battle_players")
    .select()
    .eq("battle_id", battle.id)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existing) throw new Error("Already in this battle");

  await supabase.from("battle_players").insert({
    battle_id: battle.id,
    player_id: playerId,
    player_name: playerName,
  });

  const { data: players } = await supabase
    .from("battle_players")
    .select()
    .eq("battle_id", battle.id)
    .order("updated_at", { ascending: true });

  return { battle: battle as Battle, players: (players ?? []) as BattlePlayer[] };
}

export async function getBattle(
  code: string
): Promise<{ battle: Battle; players: BattlePlayer[] } | null> {
  const { data: battle, error } = await supabase
    .from("battles")
    .select()
    .eq("code", code.toUpperCase())
    .single();

  if (error || !battle) return null;

  const { data: players } = await supabase
    .from("battle_players")
    .select()
    .eq("battle_id", battle.id)
    .order("wpm", { ascending: false });

  return { battle: battle as Battle, players: (players ?? []) as BattlePlayer[] };
}

export async function startBattle(
  battleId: string,
  hostId: string
): Promise<void> {
  const { data: battle } = await supabase
    .from("battles")
    .select()
    .eq("id", battleId)
    .single();

  if (!battle || battle.host_id !== hostId) throw new Error("Not the host");

  await supabase
    .from("battles")
    .update({ status: "countdown" })
    .eq("id", battleId);

  // After 3s countdown, set to playing
  setTimeout(async () => {
    await supabase
      .from("battles")
      .update({ status: "playing" })
      .eq("id", battleId);
  }, 3000);
}

export async function updatePlayerProgress(
  battleId: string,
  playerId: string,
  wordIndex: number,
  charIndex: number,
  correctChars: number,
  wpm: number
): Promise<void> {
  await supabase
    .from("battle_players")
    .update({
      word_index: wordIndex,
      char_index: charIndex,
      correct_chars: correctChars,
      wpm,
      updated_at: new Date().toISOString(),
    })
    .eq("battle_id", battleId)
    .eq("player_id", playerId);
}

export async function eliminatePlayer(
  battleId: string,
  playerId: string,
  round: number
): Promise<void> {
  await supabase
    .from("battle_players")
    .update({
      is_eliminated: true,
      eliminated_at: new Date().toISOString(),
      elimination_round: round,
    })
    .eq("battle_id", battleId)
    .eq("player_id", playerId);
}

export async function getLowestWpmPlayer(
  battleId: string
): Promise<BattlePlayer | null> {
  const { data } = await supabase
    .from("battle_players")
    .select()
    .eq("battle_id", battleId)
    .eq("is_eliminated", false)
    .order("wpm", { ascending: true })
    .limit(1)
    .single();

  return data as BattlePlayer | null;
}

export async function getActivePlayers(
  battleId: string
): Promise<BattlePlayer[]> {
  const { data } = await supabase
    .from("battle_players")
    .select()
    .eq("battle_id", battleId)
    .eq("is_eliminated", false);

  return (data ?? []) as BattlePlayer[];
}

export async function setWinner(
  battleId: string,
  playerId: string
): Promise<void> {
  await supabase
    .from("battle_players")
    .update({ is_winner: true })
    .eq("battle_id", battleId)
    .eq("player_id", playerId);

  await supabase
    .from("battles")
    .update({ status: "finished" })
    .eq("id", battleId);
}

export function subscribeToBattle(
  battleId: string,
  callback: (battle: Battle) => void
): RealtimeChannel {
  const uid = Math.random().toString(36).slice(2, 8);
  return supabase
    .channel(`battle-${battleId}-${uid}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "battles",
        filter: `id=eq.${battleId}`,
      },
      (payload) => {
        callback(payload.new as Battle);
      }
    )
    .subscribe();
}

export function subscribeToPlayers(
  battleId: string,
  callback: (player: BattlePlayer) => void
): RealtimeChannel {
  const uid = Math.random().toString(36).slice(2, 8);
  return supabase
    .channel(`battle-players-${battleId}-${uid}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "battle_players",
        filter: `battle_id=eq.${battleId}`,
      },
      (payload) => {
        callback(payload.new as BattlePlayer);
      }
    )
    .subscribe();
}
