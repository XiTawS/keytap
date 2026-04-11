-- Leaderboard: one record per user, stores personal best WPM

CREATE TABLE leaderboard (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url   text,
  best_wpm     integer NOT NULL,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Row Level Security
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Anyone can read the leaderboard (no login required)
CREATE POLICY "public read"
  ON leaderboard FOR SELECT
  USING (true);

-- Only the owner can insert their own score
CREATE POLICY "owner insert"
  ON leaderboard FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can update their own score
CREATE POLICY "owner update"
  ON leaderboard FOR UPDATE
  USING (auth.uid() = user_id);
