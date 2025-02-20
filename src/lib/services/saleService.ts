import { supabase } from '../supabaseClient';
import { stockMovementService } from './stockMovementService';

export interface Sale {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
  created_by: string;
  client_name: string;
  description: string;
  product?: {
    name: string;
    presentations?: {
      unit: string;
    }[];
  };
}

export const saleService = {
  async createSale(
    productId: string,
    presentationId: string,
    quantity: number,
    unitPrice: number,
    saleDate: string,
    clientName: string,
    description: string,
  ): Promise<{ data: Sale | null; error: Error | null }> {
    try {
      // 1. Vérifier le stock actuel
      const { data: presentation, error: presentationError } = await supabase
        .from('presentations')
        .select('stock')
        .eq('id', presentationId)
        .single();

      if (presentationError) throw presentationError;
      if (!presentation) throw new Error('Présentation non trouvée');

      const currentStock = presentation.stock;
      if (currentStock < quantity) {
        throw new Error('Stock insuffisant');
      }

      // 2. Calculer le montant total
      const totalAmount = quantity * unitPrice;

      // 3. Créer la vente avec la date formatée
      const formattedDate = new Date(saleDate).toISOString();
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          product_id: productId,
          quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          sale_date: formattedDate,
          client_name: clientName,
          description,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // 4. Mettre à jour le stock
      const newStock = currentStock - quantity;
      const { error: updateError } = await supabase
        .from('presentations')
        .update({ stock: newStock })
        .eq('id', presentationId);

      if (updateError) throw updateError;

      // 5. Créer le mouvement de stock
      await stockMovementService.create({
        productId,
        presentationId,
        quantityIn: null,
        quantityOut: quantity,
        stockBefore: currentStock,
        stockAfter: newStock,
        reason: 'SALE'
      });

      return { data: saleData, error: null };
    } catch (error) {
      console.error('Error creating sale:', error);
      return { data: null, error: error as Error };
    }
  },

  async getSales(
    startDate?: string,
    endDate?: string,
  ): Promise<{ data: Sale[] | null; error: Error | null }> {
    try {
      let query = supabase
        .from('sales')
        .select(`
          *,
          product:products (
            name,
            presentations (
              unit
            )
          )
        `)
        .order('sale_date', { ascending: false });

      if (startDate) {
        query = query.gte('sale_date', new Date(startDate).toISOString());
      }
      if (endDate) {
        query = query.lte('sale_date', new Date(endDate).toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching sales:', error);
      return { data: null, error: error as Error };
    }
  },
}; 