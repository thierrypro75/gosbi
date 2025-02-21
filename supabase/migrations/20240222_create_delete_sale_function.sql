CREATE OR REPLACE FUNCTION delete_sale(
  p_sale_id UUID,
  p_product_id UUID,
  p_presentation_id UUID,
  p_quantity INTEGER,
  p_stock_before INTEGER,
  p_stock_after INTEGER
) RETURNS void AS $$
BEGIN
  -- Marquer les mouvements de stock existants comme annulés
  UPDATE stock_movements
  SET status = 'CANCELLED'
  WHERE sale_id = p_sale_id;

  -- Supprimer la vente
  DELETE FROM sales
  WHERE id = p_sale_id;

  -- Mettre à jour le stock
  UPDATE presentations
  SET stock = p_stock_after
  WHERE id = p_presentation_id;

  -- Créer un mouvement de stock inverse
  INSERT INTO stock_movements (
    product_id,
    presentation_id,
    quantity_in,
    quantity_out,
    stock_before,
    stock_after,
    reason,
    sale_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_product_id,
    p_presentation_id,
    p_quantity,
    NULL,
    p_stock_before,
    p_stock_after,
    'CORRECTION',
    NULL,
    'ACTIVE',
    NOW(),
    NOW()
  );

  -- Si une erreur se produit, la transaction sera automatiquement annulée
END;
$$ LANGUAGE plpgsql; 