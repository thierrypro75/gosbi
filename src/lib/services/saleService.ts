import { supabase } from '../supabaseClient';
import { stockMovementService } from './stockMovementService';

export interface Sale {
  id: string;
  product_id: string;
  presentation_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
  created_by: string;
  client_name: string;
  description: string;
  status: 'ACTIVE' | 'CANCELLED';
  product?: {
    name: string;
  };
  presentation?: {
    unit: string;
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
          presentation_id: presentationId,
          quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          sale_date: formattedDate,
          client_name: clientName,
          description,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          status: 'ACTIVE'
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
        reason: 'SALE',
        saleId: saleData.id,
        status: 'ACTIVE'
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
    status: 'ACTIVE' | 'CANCELLED' = 'ACTIVE'
  ): Promise<{ data: Sale[] | null; error: Error | null }> {
    let query = supabase
      .from('sales')
      .select(`
        *,
        product:products!product_id(name),
        presentation:presentations!presentation_id(unit)
      `)
      .eq('status', status)
      .order('sale_date', { ascending: false });

    if (startDate) {
      query = query.gte('sale_date', startDate);
    }
    if (endDate) {
      query = query.lte('sale_date', endDate);
    }

    const { data, error } = await query;
    return { data, error };
  },

  async deleteSale(saleId: string): Promise<{ error: Error | null }> {
    try {
      console.log('Début de la suppression de la vente:', saleId);
      
      // 1. Récupérer les informations de la vente
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          presentation:presentations!presentation_id(stock)
        `)
        .eq('id', saleId)
        .single();

      if (saleError) {
        console.error('Erreur lors de la récupération de la vente:', saleError);
        throw saleError;
      }
      if (!sale) throw new Error('Vente non trouvée');
      
      console.log('Vente trouvée:', sale);

      // 2. Marquer la vente comme annulée en utilisant la fonction cancel_sale
      console.log('Tentative de mise à jour du statut...');
      const { data: updatedSale, error: updateError } = await supabase
        .rpc('cancel_sale', { sale_id: saleId });

      if (updateError) {
        console.error('Erreur lors de la mise à jour du statut:', updateError);
        throw updateError;
      }

      if (!updatedSale || updatedSale.status !== 'CANCELLED') {
        const error = new Error('La mise à jour du statut a échoué');
        console.error(error);
        throw error;
      }

      console.log('Vente mise à jour avec succès - nouveau statut:', updatedSale.status);

      // 3. Restaurer le stock
      const newStock = sale.presentation.stock + sale.quantity;
      const { error: stockError } = await supabase
        .from('presentations')
        .update({ stock: newStock })
        .eq('id', sale.presentation_id);

      if (stockError) {
        console.error('Erreur lors de la mise à jour du stock:', stockError);
        throw stockError;
      }
      
      console.log('Stock restauré:', newStock);

      // 4. Créer un mouvement de stock inverse
      try {
        await stockMovementService.create({
          productId: sale.product_id,
          presentationId: sale.presentation_id,
          quantityIn: sale.quantity,
          quantityOut: null,
          stockBefore: sale.presentation.stock,
          stockAfter: newStock,
          reason: 'CORRECTION',
          saleId: saleId,
          status: 'ACTIVE'
        });
        console.log('Mouvement de stock inverse créé');
      } catch (moveError) {
        console.error('Erreur lors de la création du mouvement inverse:', moveError);
        throw moveError;
      }

      return { error: null };
    } catch (error) {
      console.error('Error cancelling sale:', error);
      return { error: error as Error };
    }
  },

  async testUpdateSaleStatus(saleId: string): Promise<void> {
    console.log('Testing direct status update for sale:', saleId);
    
    // First, check current status
    const { data: currentSale, error: readError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .single();
    
    console.log('Current sale:', currentSale);
    
    if (readError) {
      console.error('Error reading sale:', readError);
      return;
    }

    // Try to update using the cancel_sale function
    const { data: updatedSale, error: updateError } = await supabase
      .rpc('cancel_sale', { sale_id: saleId });
    
    console.log('Update attempt result:', { updatedSale, updateError });

    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .single();
    
    console.log('Verification after update:', { verifyData, verifyError });

    if (verifyData?.status === 'ACTIVE') {
      console.error('Failed to update status. Current status is still ACTIVE');
    }
  },
}; 