import { supabase } from '../supabaseClient';
import { StockMovement, StockMovementCreate } from '../schemas/stockMovement';
import { toast } from 'react-hot-toast';

const STOCK_MOVEMENTS_TABLE = 'stock_movements';

export const stockMovementService = {
  async getAll() {
    const { data, error } = await supabase
      .from(STOCK_MOVEMENTS_TABLE)
      .select(`
        *,
        product:products!stock_movements_product_id_fkey(name),
        presentation:presentations!stock_movements_presentation_id_fkey(unit)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stock movements:', error);
      toast.error('Erreur lors du chargement des mouvements de stock');
      throw error;
    }

    return data;
  },

  async getByPresentation(presentationId: string) {
    const { data, error } = await supabase
      .from(STOCK_MOVEMENTS_TABLE)
      .select(`
        *,
        product:products!stock_movements_product_id_fkey(name),
        presentation:presentations!stock_movements_presentation_id_fkey(unit)
      `)
      .eq('presentation_id', presentationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stock movements:', error);
      toast.error('Erreur lors du chargement des mouvements de stock');
      throw error;
    }

    return data;
  },

  async create(movement: StockMovementCreate) {
    const { data, error } = await supabase
      .from(STOCK_MOVEMENTS_TABLE)
      .insert([{
        product_id: movement.productId,
        presentation_id: movement.presentationId,
        quantity_in: movement.quantityIn,
        quantity_out: movement.quantityOut,
        stock_before: movement.stockBefore,
        stock_after: movement.stockAfter,
        reason: movement.reason,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('Error creating stock movement:', error);
      toast.error('Erreur lors de la création du mouvement de stock');
      throw error;
    }

    return data[0];
  }
}; 