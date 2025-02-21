CREATE OR REPLACE FUNCTION cancel_sale(sale_id uuid)
RETURNS sales AS $$
DECLARE
  updated_sale sales;
BEGIN
  UPDATE sales
  SET status = 'CANCELLED'
  WHERE id = sale_id
  RETURNING * INTO updated_sale;
  
  RETURN updated_sale;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER; 