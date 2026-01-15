-- Run this in Supabase SQL Editor to reset the drugs table to a clean schema

-- Option 1: Drop and recreate (DELETES ALL DATA)
DROP TABLE IF EXISTS drugs CASCADE;

CREATE TABLE drugs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  trade_name text not null,
  category text
);

ALTER TABLE drugs enable row level security;

CREATE POLICY "Drugs are viewable by everyone." ON drugs
  FOR select USING (true);

-- ============================================
-- IMPORTANT: For CSV Import
-- ============================================
-- When importing your CSV, map the columns like this:
--
-- CSV Column        →  Database Column
-- ----------------     ------------------
-- "Drugname"       →  trade_name
-- "Category"       →  category
--
-- Ignore all other CSV columns (Price, Form, Company, etc.)
-- ============================================
