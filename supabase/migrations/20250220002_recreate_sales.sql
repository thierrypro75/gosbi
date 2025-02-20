-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Allow authenticated users to read sales" ON sales;
DROP POLICY IF EXISTS "Allow users to insert sales" ON sales;
DROP POLICY IF EXISTS "Allow users to insert their own sales" ON sales;

-- Supprimer la table sales si elle existe
DROP TABLE IF EXISTS sales;

-- Créer la table sales avec la nouvelle structure
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  sale_date timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  client_name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Ajouter les politiques RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true); 