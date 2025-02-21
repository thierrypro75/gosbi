-- Créer le type enum s'il n'existe pas
DO $$ BEGIN
    CREATE TYPE sale_status AS ENUM ('ACTIVE', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ajouter la colonne status si elle n'existe pas
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status sale_status NOT NULL DEFAULT 'ACTIVE';

-- Mettre à jour toutes les ventes existantes sans statut
UPDATE sales SET status = 'ACTIVE' WHERE status IS NULL;

-- 3. Créer un index pour améliorer les performances des requêtes filtrées par status
CREATE INDEX idx_sales_status ON sales(status); 