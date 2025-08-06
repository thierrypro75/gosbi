-- Create selling_prices table for multiple selling prices with labels
CREATE TABLE IF NOT EXISTS selling_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id uuid NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  label text NOT NULL,
  price decimal(10,2) NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure only one default price per presentation
  CONSTRAINT unique_default_per_presentation UNIQUE (presentation_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes
CREATE INDEX idx_selling_prices_presentation_id ON selling_prices(presentation_id);
CREATE INDEX idx_selling_prices_default ON selling_prices(presentation_id, is_default);

-- Enable RLS
ALTER TABLE selling_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for selling_prices
CREATE POLICY "Allow authenticated users to read selling_prices"
  ON selling_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert selling_prices"
  ON selling_prices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update selling_prices"
  ON selling_prices FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete selling_prices"
  ON selling_prices FOR DELETE
  TO authenticated
  USING (true);

-- Function to ensure only one default price per presentation
CREATE OR REPLACE FUNCTION ensure_single_default_price()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new record is being set as default
  IF NEW.is_default = true THEN
    -- Update all other prices for the same presentation to not be default
    UPDATE selling_prices 
    SET is_default = false 
    WHERE presentation_id = NEW.presentation_id 
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure only one default price per presentation
CREATE TRIGGER trigger_ensure_single_default_price
  BEFORE INSERT OR UPDATE ON selling_prices
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_price();

-- Add selling_price_id to sales table
ALTER TABLE sales ADD COLUMN selling_price_id uuid REFERENCES selling_prices(id);

-- Create index for sales selling_price_id
CREATE INDEX idx_sales_selling_price_id ON sales(selling_price_id); 