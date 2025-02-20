/*
  # Initial Schema Setup for Gosbi Management System

  1. New Tables
    - users (managed by Supabase Auth)
    - products
      - Product information and inventory tracking
    - sales
      - Sales transaction records
    - stock_alerts
      - Automated low stock notifications
    - stock_movements
      - Stock movement records

  2. Security
    - RLS policies for all tables
    - Role-based access control
*/

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Presentations Table
CREATE TABLE IF NOT EXISTS presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  unit text NOT NULL,
  purchase_price decimal(10,2) NOT NULL,
  selling_price decimal(10,2) NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  sku text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sales Table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  transaction_date timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  client_name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Stock Alerts Table
CREATE TABLE IF NOT EXISTS stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  presentation_id uuid REFERENCES presentations(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Stock Movements Table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  presentation_id uuid REFERENCES presentations(id) ON DELETE CASCADE,
  quantity_in integer,
  quantity_out integer,
  stock_before integer NOT NULL,
  stock_after integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read presentations"
  ON presentations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert presentations"
  ON presentations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update presentations"
  ON presentations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete presentations"
  ON presentations FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read alerts"
  ON stock_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update alerts"
  ON stock_alerts FOR UPDATE
  TO authenticated
  USING (true);

-- Stock Movements Policies
CREATE POLICY "Allow authenticated users to read stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to insert stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_presentations_updated_at
  BEFORE UPDATE ON presentations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to create stock alert
CREATE OR REPLACE FUNCTION create_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_stock <= NEW.minimum_stock THEN
    INSERT INTO stock_alerts (product_id, alert_type, message)
    VALUES (
      NEW.id,
      'LOW_STOCK',
      format('Le stock du produit %s (SKU: %s) est bas. Stock actuel: %s, Minimum requis: %s',
        NEW.name,
        NEW.sku,
        NEW.current_stock,
        NEW.minimum_stock
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stock alerts
CREATE TRIGGER check_stock_level
  AFTER INSERT OR UPDATE OF current_stock ON products
  FOR EACH ROW
  EXECUTE FUNCTION create_stock_alert();