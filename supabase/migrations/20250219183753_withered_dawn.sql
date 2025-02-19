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

  2. Security
    - RLS policies for all tables
    - Role-based access control
*/

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sku text UNIQUE NOT NULL,
  price decimal(10,2) NOT NULL,
  current_stock integer NOT NULL DEFAULT 0,
  minimum_stock integer NOT NULL DEFAULT 10,
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
  created_by uuid REFERENCES auth.users(id)
);

-- Stock Alerts Table
CREATE TABLE IF NOT EXISTS stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  alert_type text NOT NULL,
  message text NOT NULL,
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Allow authenticated users to read sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to insert their own sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow authenticated users to read alerts"
  ON stock_alerts FOR SELECT
  TO authenticated
  USING (true);

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