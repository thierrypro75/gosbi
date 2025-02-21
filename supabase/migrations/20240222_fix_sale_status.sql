DO $$
BEGIN
    -- Vérifier si le type enum existe déjà
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sale_status') THEN
        -- Créer le type enum s'il n'existe pas
        CREATE TYPE sale_status AS ENUM ('ACTIVE', 'CANCELLED');
    END IF;

    -- Vérifier si la colonne status existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'sales'
        AND column_name = 'status'
    ) THEN
        -- Ajouter la colonne si elle n'existe pas
        ALTER TABLE sales ADD COLUMN status sale_status NOT NULL DEFAULT 'ACTIVE';
    ELSE
        -- Si la colonne existe mais n'est pas du bon type, la recréer
        ALTER TABLE sales ALTER COLUMN status TYPE sale_status USING status::sale_status;
        ALTER TABLE sales ALTER COLUMN status SET DEFAULT 'ACTIVE';
        ALTER TABLE sales ALTER COLUMN status SET NOT NULL;
    END IF;

    -- Créer l'index s'il n'existe pas
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_sales_status'
    ) THEN
        CREATE INDEX idx_sales_status ON sales(status);
    END IF;

    -- S'assurer que toutes les ventes existantes ont un statut
    UPDATE sales SET status = 'ACTIVE' WHERE status IS NULL;
END $$; 