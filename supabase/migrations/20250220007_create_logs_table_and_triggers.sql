-- Créer la table logs pour enregistrer toutes les actions sur toutes les tables
CREATE TABLE IF NOT EXISTS logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id uuid REFERENCES auth.users(id),
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Créer des index pour améliorer les performances des requêtes
CREATE INDEX idx_logs_table_name ON logs(table_name);
CREATE INDEX idx_logs_action ON logs(action);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_record_id ON logs(record_id);
CREATE INDEX idx_logs_created_at ON logs(created_at);
CREATE INDEX idx_logs_table_action ON logs(table_name, action);

-- Fonction générique pour logger les actions
CREATE OR REPLACE FUNCTION log_table_action()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_record_id uuid;
  v_old_data jsonb;
  v_new_data jsonb;
  v_action text;
BEGIN
  -- Récupérer l'ID de l'utilisateur actuel
  v_user_id := auth.uid();
  
  -- Déterminer l'action et les données selon le type de trigger
  IF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_record_id := OLD.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_record_id := NEW.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'INSERT';
    v_record_id := NEW.id;
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  END IF;
  
  -- Insérer le log
  INSERT INTO logs (table_name, action, user_id, record_id, old_data, new_data)
  VALUES (TG_TABLE_NAME, v_action, v_user_id, v_record_id, v_old_data, v_new_data);
  
  -- Retourner le bon enregistrement selon l'opération
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activer RLS sur la table logs
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour la table logs
-- Les utilisateurs authentifiés peuvent lire tous les logs
CREATE POLICY "Allow authenticated users to read logs"
  ON logs FOR SELECT
  TO authenticated
  USING (true);

-- Seuls les admins peuvent insérer des logs (via les triggers)
-- Les triggers utilisent SECURITY DEFINER donc ils peuvent insérer

-- Créer les triggers pour toutes les tables

-- Products
CREATE TRIGGER log_products_insert
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_products_update
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_products_delete
  AFTER DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

-- Presentations
CREATE TRIGGER log_presentations_insert
  AFTER INSERT ON presentations
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_presentations_update
  AFTER UPDATE ON presentations
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_presentations_delete
  AFTER DELETE ON presentations
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

-- Sales
CREATE TRIGGER log_sales_insert
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_sales_update
  AFTER UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_sales_delete
  AFTER DELETE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

-- Stock Alerts
CREATE TRIGGER log_stock_alerts_insert
  AFTER INSERT ON stock_alerts
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_stock_alerts_update
  AFTER UPDATE ON stock_alerts
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_stock_alerts_delete
  AFTER DELETE ON stock_alerts
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

-- Stock Movements
CREATE TRIGGER log_stock_movements_insert
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_stock_movements_update
  AFTER UPDATE ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_stock_movements_delete
  AFTER DELETE ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

-- Supplies
CREATE TRIGGER log_supplies_insert
  AFTER INSERT ON supplies
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_supplies_update
  AFTER UPDATE ON supplies
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_supplies_delete
  AFTER DELETE ON supplies
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

-- Supply Lines
CREATE TRIGGER log_supply_lines_insert
  AFTER INSERT ON supply_lines
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_supply_lines_update
  AFTER UPDATE ON supply_lines
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_supply_lines_delete
  AFTER DELETE ON supply_lines
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

-- Clients
CREATE TRIGGER log_clients_insert
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_clients_update
  AFTER UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_clients_delete
  AFTER DELETE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

-- Selling Prices
CREATE TRIGGER log_selling_prices_insert
  AFTER INSERT ON selling_prices
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_selling_prices_update
  AFTER UPDATE ON selling_prices
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();

CREATE TRIGGER log_selling_prices_delete
  AFTER DELETE ON selling_prices
  FOR EACH ROW
  EXECUTE FUNCTION log_table_action();


