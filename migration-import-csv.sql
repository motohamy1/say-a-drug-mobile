-- ============================================
-- CSV Import Helper for drugs table
-- ============================================
-- Use this script to import your CSV into Supabase

-- Step 1: Create a staging table that matches your CSV exactly
DROP TABLE IF EXISTS drugs_staging CASCADE;

CREATE TABLE drugs_staging (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  "Drugname" text,
  "Price" text,
  "Search Query" text,
  "Date" text,
  "Price_prev" text,
  "Price Changed" text,
  "Form" text,
  "Company" text,
  "Region" text,
  "Category" text
);

-- Step 2: Import your CSV into the drugs_staging table
-- (Use Supabase Table Editor → Import CSV, select drugs_staging table)

-- Step 3: After CSV import is complete, run this to copy only needed data:
INSERT INTO drugs (trade_name, category)
SELECT
  "Drugname",
  "Category"
FROM drugs_staging
WHERE "Drugname" IS NOT NULL
  AND "Category" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 4: Verify the import
SELECT COUNT(*) as total_drugs FROM drugs;

-- Step 5: Clean up staging table (optional - keep it for future imports)
-- DROP TABLE IF EXISTS drugs_staging CASCADE;
