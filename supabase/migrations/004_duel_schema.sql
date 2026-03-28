-- Duel mode tables

CREATE TABLE duels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  word_seed text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  time_limit integer NOT NULL DEFAULT 30,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  player1_id text NOT NULL,
  player2_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE duel_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id uuid REFERENCES duels(id) ON DELETE CASCADE,
  player_id text NOT NULL,
  word_index integer DEFAULT 0,
  char_index integer DEFAULT 0,
  correct_chars integer DEFAULT 0,
  incorrect_chars integer DEFAULT 0,
  wpm integer DEFAULT 0,
  finished boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(duel_id, player_id)
);

-- RLS (permissive for now — no auth)
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on duels" ON duels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on duel_progress" ON duel_progress FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE duels;
ALTER PUBLICATION supabase_realtime ADD TABLE duel_progress;
