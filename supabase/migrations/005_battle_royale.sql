-- Battle Royale tables

CREATE TABLE battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  word_seed text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  elimination_mode text NOT NULL DEFAULT 'fixed' CHECK (elimination_mode IN ('fixed', 'accelerating')),
  elimination_interval integer NOT NULL DEFAULT 15,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'countdown', 'playing', 'finished')),
  host_id text NOT NULL,
  max_players integer DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE battle_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid REFERENCES battles(id) ON DELETE CASCADE,
  player_id text NOT NULL,
  player_name text NOT NULL,
  word_index integer DEFAULT 0,
  char_index integer DEFAULT 0,
  correct_chars integer DEFAULT 0,
  wpm integer DEFAULT 0,
  is_eliminated boolean DEFAULT false,
  eliminated_at timestamptz,
  elimination_round integer,
  is_winner boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(battle_id, player_id)
);

-- RLS: permissive (anyone can read/write)
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on battles" ON battles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on battle_players" ON battle_players FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE battles;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_players;
