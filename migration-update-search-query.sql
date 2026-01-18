-- Run this in the Supabase SQL Editor to populate the "Search Query" column
-- Formula: Drugname + Form + Category

UPDATE drugs
SET "Search Query" = 
  TRIM(
    COALESCE("Drugname", '') || ' ' || 
    COALESCE("Form", '') || ' ' || 
    COALESCE("Category", '')
  );
