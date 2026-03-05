-- ============================================
-- Supabase Setup SQL
-- Run this in your Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)
-- ============================================

-- 1. Create the wishes table
CREATE TABLE wishes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  notes TEXT,
  fulfilled BOOLEAN NOT NULL DEFAULT FALSE,
  fulfilled_by TEXT,
  league TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create index for fast league-based queries
CREATE INDEX idx_wishes_league ON wishes (league);

-- 3. Enable Row Level Security
ALTER TABLE wishes ENABLE ROW LEVEL SECURITY;

-- 4. Allow anyone (anonymous) to read wishes
CREATE POLICY "Anyone can read wishes"
  ON wishes FOR SELECT
  USING (true);

-- 5. Allow anyone to insert wishes
CREATE POLICY "Anyone can insert wishes"
  ON wishes FOR INSERT
  WITH CHECK (true);

-- 6. Allow anyone to update wishes (for marking fulfilled)
CREATE POLICY "Anyone can update wishes"
  ON wishes FOR UPDATE
  USING (true);

-- 7. Allow anyone to delete wishes
CREATE POLICY "Anyone can delete wishes"
  ON wishes FOR DELETE
  USING (true);

-- 8. Enable realtime for the wishes table
ALTER PUBLICATION supabase_realtime ADD TABLE wishes;
