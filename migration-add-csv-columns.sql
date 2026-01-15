-- Run this in Supabase SQL Editor to fix the drugs table for CSV import

-- First, make existing columns nullable to allow CSV import
ALTER TABLE drugs
  ALTER COLUMN trade_name DROP NOT NULL,
  ALTER COLUMN price DROP NOT NULL;

-- Then add the missing CSV columns
ALTER TABLE drugs
  ADD COLUMN IF NOT EXISTS "Drugname" text,
  ADD COLUMN IF NOT EXISTS "Price" numeric,
  ADD COLUMN IF NOT EXISTS "Company" text,
  ADD COLUMN IF NOT EXISTS "Form" text,
  ADD COLUMN IF NOT EXISTS "Search Query" text,
  ADD COLUMN IF NOT EXISTS "Date" text,
  ADD COLUMN IF NOT EXISTS "Price_prev" numeric,
  ADD COLUMN IF NOT EXISTS "Price Changed" boolean,
  ADD COLUMN IF NOT EXISTS "Region" text,
  ADD COLUMN IF NOT EXISTS "Category" text;

-- Optional: Copy data from existing columns to new ones for consistency
UPDATE drugs
SET
  "Drugname" = trade_name,
  "Price" = price,
  "Company" = manufacturer,
  "Form" = dosage_form
WHERE "Drugname" IS NULL;
