import { supabase } from '../supabaseClient';
import { Supply, SupplyCreate, SupplyUpdate, SupplyLine, SupplyLineUpdate } from '../schemas/supply';
import { stockMovementService } from './stockMovementService';
import { toast } from 'react-hot-toast';

const SUPPLIES_TABLE = 'supplies';
const SUPPLY_LINES_TABLE = 'supply_lines';

export const supplyService = {
  async getAll() {
    const { data, error } = await supabase
      .from(SUPPLIES_TABLE)
      .select(`
        *,
        lines:${SUPPLY_LINES_TABLE}(
          *,
          product:products(name, category),
          presentation:presentations(unit, purchase_price, selling_price)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching supplies:', error);
      throw error;
    }

    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from(SUPPLIES_TABLE)
      .select(`
        *,
        lines:${SUPPLY_LINES_TABLE}(
          id,
          ordered_quantity,
          received_quantity,
          purchase_price,
          selling_price,
          status,
          product:products(name, category),
          presentation:presentations(unit, purchase_price, selling_price)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching supply:', error);
      throw error;
    }

    // Convertir les données en format camelCase
    return {
      ...data,
      lines: data.lines.map((line: any) => ({
        ...line,
        orderedQuantity: line.ordered_quantity,
        receivedQuantity: line.received_quantity,
        purchasePrice: line.purchase_price,
        sellingPrice: line.selling_price,
        product: line.product,
        presentation: line.presentation
      }))
    };
  },

  async create(supply: SupplyCreate) {
    const { data: newSupply, error: supplyError } = await supabase
      .from(SUPPLIES_TABLE)
      .insert([{
        description: supply.description,
        status: 'COMMANDE_INITIEE'
      }])
      .select()
      .single();

    if (supplyError) {
      console.error('Error creating supply:', supplyError);
      throw supplyError;
    }

    const lines = supply.lines.map(line => ({
      supply_id: newSupply.id,
      product_id: line.productId,
      presentation_id: line.presentationId,
      ordered_quantity: line.orderedQuantity,
      received_quantity: 0,
      purchase_price: line.purchasePrice,
      selling_price: line.sellingPrice,
      status: 'EN_ATTENTE'
    }));

    const { error: linesError } = await supabase
      .from(SUPPLY_LINES_TABLE)
      .insert(lines);

    if (linesError) {
      console.error('Error creating supply lines:', linesError);
      // Supprimer l'approvisionnement si les lignes n'ont pas pu être créées
      await supabase.from(SUPPLIES_TABLE).delete().eq('id', newSupply.id);
      throw linesError;
    }

    return this.getById(newSupply.id);
  },

  async updateLine(id: string, data: SupplyLineUpdate) {
    // Récupérer d'abord la ligne actuelle pour avoir l'ancienne quantité reçue
    const { data: currentLine, error: getError } = await supabase
      .from(SUPPLY_LINES_TABLE)
      .select('*, presentation:presentations(*)')
      .eq('id', id)
      .single();

    if (getError) {
      console.error('Error fetching supply line:', getError);
      throw getError;
    }

    // Calculer la différence de quantité pour le mouvement de stock
    const quantityDiff = (data.receivedQuantity || 0) - (currentLine.received_quantity || 0);

    // Mise à jour de la ligne
    const { error: updateError } = await supabase
      .from(SUPPLY_LINES_TABLE)
      .update({
        received_quantity: data.receivedQuantity,
        purchase_price: data.purchasePrice,
        selling_price: data.sellingPrice,
        status: data.status
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating supply line:', updateError);
      throw updateError;
    }

    // Si il y a une différence de quantité, créer un mouvement de stock
    if (quantityDiff !== 0) {
      try {
        await stockMovementService.create({
          productId: currentLine.product_id,
          presentationId: currentLine.presentation_id,
          quantityIn: quantityDiff > 0 ? quantityDiff : null,
          quantityOut: quantityDiff < 0 ? -quantityDiff : null,
          stockBefore: currentLine.presentation.stock,
          stockAfter: currentLine.presentation.stock + quantityDiff,
          reason: 'SUPPLY',
          status: 'ACTIVE'
        });

        // Mettre à jour le stock de la présentation
        await supabase
          .from('presentations')
          .update({ 
            stock: currentLine.presentation.stock + quantityDiff,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentLine.presentation_id);

      } catch (error) {
        console.error('Error updating stock:', error);
        toast.error('Erreur lors de la mise à jour du stock');
        throw error;
      }
    }

    // Mettre à jour le statut de la commande
    const updatedSupply = await this.getById(currentLine.supply_id);
    const newStatus = this.calculateSupplyStatus(updatedSupply.lines);

    const { error: statusError } = await supabase
      .from(SUPPLIES_TABLE)
      .update({ status: newStatus })
      .eq('id', currentLine.supply_id);

    if (statusError) {
      console.error('Error updating supply status:', statusError);
      throw statusError;
    }

    return updatedSupply;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from(SUPPLIES_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting supply:', error);
      throw error;
    }
  },

  calculateSupplyStatus(lines: SupplyLine[]): SupplyStatus {
    if (lines.length === 0) return 'COMMANDE_INITIEE';

    const totalReceived = lines.reduce((sum, line) => sum + (line.receivedQuantity || 0), 0);
    const totalOrdered = lines.reduce((sum, line) => sum + line.orderedQuantity, 0);

    if (totalReceived === 0) return 'COMMANDE_INITIEE';
    if (totalReceived === totalOrdered) return 'RECEPTIONNE';
    if (totalReceived < totalOrdered) return 'PARTIELLEMENT_RECEPTIONNE';
    return 'COMMANDE_INITIEE'; // Par défaut
  }
}; 