-- Créer la table clients pour le CRM
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  company text,
  notes text,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ajouter les politiques RLS pour les clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (true);

-- Ajouter un index sur le nom pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- Modifier la table sales pour référencer la table clients
ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_name_backup text;

-- Mettre à jour les ventes existantes pour créer des clients
INSERT INTO clients (name, created_by)
SELECT DISTINCT client_name, created_by
FROM sales
WHERE client_name IS NOT NULL AND client_name != ''
ON CONFLICT (name) DO NOTHING;

-- Mettre à jour les ventes pour lier aux clients
UPDATE sales 
SET client_id = c.id
FROM clients c
WHERE sales.client_name = c.name;

-- Sauvegarder les noms de clients existants
UPDATE sales 
SET client_name_backup = client_name
WHERE client_name IS NOT NULL;

-- Créer une fonction pour obtenir ou créer un client
CREATE OR REPLACE FUNCTION get_or_create_client(
  client_name text,
  client_email text DEFAULT NULL,
  client_phone text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  client_id uuid;
BEGIN
  -- Chercher le client existant
  SELECT id INTO client_id
  FROM clients
  WHERE name = client_name;
  
  -- Si le client n'existe pas, le créer
  IF client_id IS NULL THEN
    INSERT INTO clients (name, email, phone, created_by)
    VALUES (client_name, client_email, client_phone, auth.uid())
    RETURNING id INTO client_id;
  END IF;
  
  RETURN client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
