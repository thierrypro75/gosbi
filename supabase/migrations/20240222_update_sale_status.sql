CREATE OR REPLACE FUNCTION update_sale_status(sale_id uuid, new_status sale_status)
RETURNS void AS $$
BEGIN
  UPDATE sales
  SET status = new_status
  WHERE id = sale_id;
END;
$$ LANGUAGE plpgsql; 