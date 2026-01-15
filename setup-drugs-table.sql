-- ============================================
-- Step 1: Create the clean drugs table
-- Run this first in Supabase SQL Editor
-- ============================================

DROP TABLE IF EXISTS drugs CASCADE;

CREATE TABLE drugs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  trade_name text not null,
  category text
);

ALTER TABLE drugs ENABLE row level security;

CREATE POLICY "Drugs are viewable by everyone." ON drugs
  FOR select USING (true);

-- Optional: Create unique index on trade_name to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS drugs_trade_name_idx ON drugs (trade_name);
