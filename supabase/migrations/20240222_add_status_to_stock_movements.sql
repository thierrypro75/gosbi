-- 1. Ajouter le type enum pour le status
CREATE TYPE stock_movement_status AS ENUM ('ACTIVE', 'CANCELLED');

-- 2. Ajouter la colonne status avec ACTIVE comme valeur par défaut
ALTER TABLE stock_movements ADD COLUMN status stock_movement_status NOT NULL DEFAULT 'ACTIVE';

-- 3. Créer un index pour améliorer les performances des requêtes filtrées par status
CREATE INDEX idx_stock_movements_status ON stock_movements(status); 