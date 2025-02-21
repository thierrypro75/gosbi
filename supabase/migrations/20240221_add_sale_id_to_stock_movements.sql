-- 1. Ajouter la colonne sale_id
ALTER TABLE stock_movements ADD COLUMN sale_id UUID REFERENCES sales(id);

-- 2. Créer un index pour améliorer les performances des jointures
CREATE INDEX idx_stock_movements_sale_id ON stock_movements(sale_id);

-- 3. Mettre à jour les mouvements de stock existants liés aux ventes
UPDATE stock_movements sm
SET sale_id = s.id
FROM sales s
WHERE sm.reason = 'SALE'
AND sm.product_id = s.product_id
AND sm.quantity_out = s.quantity
AND sm.created_at >= s.sale_date
AND sm.created_at <= s.sale_date + interval '1 minute'; 