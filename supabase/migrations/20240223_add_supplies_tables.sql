-- Create supply status enum type
CREATE TYPE supply_status AS ENUM (
  'COMMANDE_INITIEE',
  'RECEPTIONNE',
  'PARTIELLEMENT_RECEPTIONNE',
  'NON_RECEPTIONNE'
);

-- Create supply line status enum type
CREATE TYPE supply_line_status AS ENUM (
  'EN_ATTENTE',
  'RECEPTIONNE',
  'PARTIELLEMENT_RECEPTIONNE',
  'NON_RECEPTIONNE'
);

-- Create supplies table
CREATE TABLE IF NOT EXISTS supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text,
  status supply_status NOT NULL DEFAULT 'COMMANDE_INITIEE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create supply_lines table
CREATE TABLE IF NOT EXISTS supply_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_id uuid NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  presentation_id uuid NOT NULL REFERENCES presentations(id) ON DELETE RESTRICT,
  ordered_quantity integer NOT NULL CHECK (ordered_quantity > 0),
  received_quantity integer NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  purchase_price decimal(10,2),
  selling_price decimal(10,2),
  status supply_line_status NOT NULL DEFAULT 'EN_ATTENTE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Ensure received_quantity doesn't exceed ordered_quantity
  CONSTRAINT received_quantity_check CHECK (received_quantity <= ordered_quantity)
);

-- Create indexes
CREATE INDEX idx_supplies_status ON supplies(status);
CREATE INDEX idx_supply_lines_supply_id ON supply_lines(supply_id);
CREATE INDEX idx_supply_lines_product_id ON supply_lines(product_id);
CREATE INDEX idx_supply_lines_presentation_id ON supply_lines(presentation_id);
CREATE INDEX idx_supply_lines_status ON supply_lines(status);

-- Enable RLS
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_lines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read supplies"
  ON supplies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert supplies"
  ON supplies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update supplies"
  ON supplies FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read supply_lines"
  ON supply_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert supply_lines"
  ON supply_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update supply_lines"
  ON supply_lines FOR UPDATE
  TO authenticated
  USING (true);

-- Create function to update supplies.updated_at
CREATE OR REPLACE FUNCTION update_supplies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update supply_lines.updated_at
CREATE OR REPLACE FUNCTION update_supply_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_supplies_updated_at
  BEFORE UPDATE ON supplies
  FOR EACH ROW
  EXECUTE FUNCTION update_supplies_updated_at();

CREATE TRIGGER update_supply_lines_updated_at
  BEFORE UPDATE ON supply_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_supply_lines_updated_at();

-- Create function to update supply status based on its lines
CREATE OR REPLACE FUNCTION update_supply_status()
RETURNS TRIGGER AS $$
DECLARE
  total_lines INTEGER;
  received_lines INTEGER;
  partially_received_lines INTEGER;
  non_received_lines INTEGER;
BEGIN
  -- Get counts for each status
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'RECEPTIONNE'),
    COUNT(*) FILTER (WHERE status = 'PARTIELLEMENT_RECEPTIONNE'),
    COUNT(*) FILTER (WHERE status = 'NON_RECEPTIONNE')
  INTO 
    total_lines,
    received_lines,
    partially_received_lines,
    non_received_lines
  FROM supply_lines
  WHERE supply_id = NEW.supply_id;

  -- Update supply status based on line statuses
  IF received_lines = total_lines THEN
    UPDATE supplies SET status = 'RECEPTIONNE' WHERE id = NEW.supply_id;
  ELSIF non_received_lines = total_lines THEN
    UPDATE supplies SET status = 'NON_RECEPTIONNE' WHERE id = NEW.supply_id;
  ELSE
    UPDATE supplies SET status = 'PARTIELLEMENT_RECEPTIONNE' WHERE id = NEW.supply_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update supply status when a line is updated
CREATE TRIGGER update_supply_status
  AFTER INSERT OR UPDATE OF status ON supply_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_supply_status(); 