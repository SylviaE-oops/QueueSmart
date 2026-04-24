-- Migration: 007_services_clean_schema.sql
-- Description: Replace text pickup_location with location_id FK and drop unused columns
-- Created: 2026-04-24

-- Step 1: Add location_id FK column.
ALTER TABLE services
  ADD COLUMN location_id INT NULL AFTER pickup_location;

-- Step 2: Backfill location_id from existing pickup_location text.
UPDATE services s
SET s.location_id = (
  SELECT MIN(l.id)
  FROM locations l
  WHERE l.name = s.pickup_location
)
WHERE s.pickup_location IS NOT NULL AND s.location_id IS NULL;

-- Step 3: Add index and foreign key.
ALTER TABLE services
  ADD INDEX idx_services_location_id (location_id),
  ADD CONSTRAINT fk_services_location
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- Step 4: Drop the old text column and unused columns.
ALTER TABLE services
  DROP COLUMN pickup_location,
  DROP COLUMN expected_duration_min,
  DROP COLUMN priority,
  DROP COLUMN stock_quantity;
