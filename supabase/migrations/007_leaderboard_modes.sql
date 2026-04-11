-- Add mode and time_limit columns to leaderboard
-- time_limit = 0 is used as sentinel for 'infinite' mode (avoids NULL in UNIQUE constraint)

ALTER TABLE leaderboard
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'time',
  ADD COLUMN IF NOT EXISTS time_limit integer NOT NULL DEFAULT 30;

-- Drop old unique constraint (one score per user total)
ALTER TABLE leaderboard
  DROP CONSTRAINT IF EXISTS leaderboard_user_id_key;

-- New unique constraint: one best score per user per mode+time_limit combination
ALTER TABLE leaderboard
  ADD CONSTRAINT leaderboard_user_mode_time_key UNIQUE (user_id, mode, time_limit);
