-- Fix selling_prices constraint
-- This migration removes the problematic unique constraint and replaces it with a proper one

-- Drop the problematic unique constraint
ALTER TABLE selling_prices DROP CONSTRAINT IF EXISTS unique_default_per_presentation;

-- Drop the trigger and function that are no longer needed
DROP TRIGGER IF EXISTS trigger_ensure_single_default_price ON selling_prices;
DROP FUNCTION IF EXISTS ensure_single_default_price();

-- Create a new constraint that only allows one default price per presentation
-- This uses a partial unique index that only applies when is_default = true
CREATE UNIQUE INDEX unique_default_per_presentation 
ON selling_prices (presentation_id) 
WHERE is_default = true;

-- Add a comment to explain the constraint
COMMENT ON INDEX unique_default_per_presentation IS 'Ensures only one default price per presentation'; 