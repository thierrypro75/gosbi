-- 1. Ajouter le type enum pour le status des ventes
CREATE TYPE sale_status AS ENUM ('ACTIVE', 'CANCELLED');

-- 2. Ajouter la colonne status avec ACTIVE comme valeur par défaut
ALTER TABLE sales ADD COLUMN status sale_status NOT NULL DEFAULT 'ACTIVE';

-- 3. Créer un index pour améliorer les performances des requêtes filtrées par status
CREATE INDEX idx_sales_status ON sales(status); 