-- 1. Ajouter la colonne presentation_id sans contrainte NOT NULL pour le moment
ALTER TABLE sales ADD COLUMN presentation_id UUID REFERENCES presentations(id);

-- 2. Vérifier les ventes qui n'ont pas de présentation correspondante
DO $$
DECLARE
    sales_without_presentation INTEGER;
BEGIN
    SELECT COUNT(*) INTO sales_without_presentation
    FROM sales s
    WHERE NOT EXISTS (
        SELECT 1
        FROM presentations p
        WHERE p.product_id = s.product_id
    );

    IF sales_without_presentation > 0 THEN
        RAISE EXCEPTION 'Il y a % ventes sans présentation correspondante. Impossible de continuer la migration.', sales_without_presentation;
    END IF;
END $$;

-- 3. Mettre à jour les enregistrements existants avec la première présentation disponible
WITH first_presentations AS (
    SELECT DISTINCT ON (product_id) 
        product_id,
        id as presentation_id
    FROM presentations
)
UPDATE sales s
SET presentation_id = fp.presentation_id
FROM first_presentations fp
WHERE s.product_id = fp.product_id
AND s.presentation_id IS NULL;

-- 4. Vérifier qu'il n'y a pas de NULL restants
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM sales
    WHERE presentation_id IS NULL;

    IF null_count > 0 THEN
        RAISE EXCEPTION 'Il reste % ventes sans presentation_id. Vérifiez les données.', null_count;
    END IF;
END $$;

-- 5. Une fois les données migrées et vérifiées, on peut ajouter la contrainte NOT NULL
ALTER TABLE sales ALTER COLUMN presentation_id SET NOT NULL;

-- 6. Ajouter un index pour améliorer les performances des jointures
CREATE INDEX idx_sales_presentation_id ON sales(presentation_id);