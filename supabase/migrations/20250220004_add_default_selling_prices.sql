-- Add default selling prices for existing presentations
-- This migration creates a default selling price for each existing presentation
-- using the current selling_price value from the presentations table

INSERT INTO selling_prices (presentation_id, label, price, is_default, created_at, updated_at)
SELECT 
  id as presentation_id,
  'Prix public' as label,
  selling_price as price,
  true as is_default,
  now() as created_at,
  now() as updated_at
FROM presentations
WHERE NOT EXISTS (
  SELECT 1 FROM selling_prices WHERE presentation_id = presentations.id
); 