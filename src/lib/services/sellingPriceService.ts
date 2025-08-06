import { supabase } from '../supabaseClient';
import { SellingPrice } from '../schemas/product';
import { toast } from 'react-hot-toast';

const SELLING_PRICES_TABLE = 'selling_prices';

export const sellingPriceService = {
  async getByPresentation(presentationId: string): Promise<SellingPrice[]> {
    const { data, error } = await supabase
      .from(SELLING_PRICES_TABLE)
      .select('*')
      .eq('presentation_id', presentationId)
      .order('is_default', { ascending: false })
      .order('label');

    if (error) {
      console.error('Error fetching selling prices:', error);
      toast.error('Erreur lors du chargement des prix de vente');
      throw error;
    }

    return data.map(price => ({
      id: price.id,
      label: price.label,
      price: price.price,
      isDefault: price.is_default,
    }));
  },

  async create(presentationId: string, sellingPrice: Omit<SellingPrice, 'id'>): Promise<SellingPrice> {
    console.log('🔍 sellingPriceService.create - Input:', { presentationId, sellingPrice });
    
    // Vérifier s'il y a déjà un prix par défaut pour cette présentation
    console.log('📋 Checking existing prices for presentation:', presentationId);
    const { data: existingPrices } = await supabase
      .from(SELLING_PRICES_TABLE)
      .select('id, is_default')
      .eq('presentation_id', presentationId);

    console.log('📋 Existing prices:', existingPrices);
    
    // Vérifier la contrainte unique
    const defaultPrices = existingPrices?.filter(p => p.is_default) || [];
    console.log('🔍 Default prices count:', defaultPrices.length);
    console.log('🔍 Default prices:', defaultPrices);
    
    // Vérifier s'il y a un problème avec la contrainte
    if (defaultPrices.length > 1) {
      console.error('🚨 PROBLEME: Il y a plusieurs prix par défaut pour cette présentation!');
      console.error('🚨 Cela viole la contrainte unique. Prix par défaut trouvés:', defaultPrices);
    }

    // Vérifier s'il y a déjà un prix par défaut
    const hasDefaultPrice = existingPrices?.some(p => p.is_default);
    console.log('🔍 Has default price:', hasDefaultPrice);

    // Si ce prix doit être par défaut
    if (sellingPrice.isDefault) {
      console.log('🎯 Price is marked as default');
      if (hasDefaultPrice) {
        // Il y a déjà un prix par défaut, désactiver tous les autres d'abord
        console.log('🔄 Disabling existing default prices...');
        const { error: updateError } = await supabase
          .from(SELLING_PRICES_TABLE)
          .update({ is_default: false })
          .eq('presentation_id', presentationId);

        if (updateError) {
          console.error('❌ Error updating default prices:', updateError);
          throw updateError;
        }
        console.log('✅ Existing default prices disabled');
      } else {
        console.log('✅ No existing default price, can create new default');
      }
    } else {
      // Si ce prix n'est pas par défaut
      console.log('🎯 Price is NOT marked as default');
      if (!hasDefaultPrice) {
        // Il n'y a pas de prix par défaut, forcer ce prix comme par défaut
        console.log('⚠️ No default price exists, forcing this price as default');
        sellingPrice.isDefault = true;
      } else {
        // Il y a déjà un prix par défaut, s'assurer que ce prix n'est pas par défaut
        console.log('✅ Default price already exists, ensuring this price is not default');
        sellingPrice.isDefault = false;
      }
    }

    // Vérification finale pour s'assurer qu'il n'y a pas de conflit
    const finalIsDefault = sellingPrice.isDefault;
    console.log('🔍 Final isDefault value:', finalIsDefault);
    
    // Si on essaie de créer un prix par défaut mais qu'il y en a déjà un, forcer à false
    if (finalIsDefault && hasDefaultPrice) {
      console.warn('⚠️ Attempting to create default price when one already exists, forcing to false');
      sellingPrice.isDefault = false;
    }

    const insertData = {
      presentation_id: presentationId,
      label: sellingPrice.label,
      price: sellingPrice.price,
      is_default: sellingPrice.isDefault,
    };
    
    console.log('📤 Inserting selling price:', insertData);
    
    // Afficher la requête SQL
    console.log('🔍 SQL Query:', `INSERT INTO ${SELLING_PRICES_TABLE} (presentation_id, label, price, is_default) VALUES ('${insertData.presentation_id}', '${insertData.label}', ${insertData.price}, ${insertData.is_default})`);
    
    const { data, error } = await supabase
      .from(SELLING_PRICES_TABLE)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating selling price:', error);
      toast.error('Erreur lors de la création du prix de vente');
      throw error;
    }

    console.log('✅ Successfully created selling price:', data);

    return {
      id: data.id,
      label: data.label,
      price: data.price,
      isDefault: data.is_default,
    };
  },

  async update(id: string, sellingPrice: Partial<SellingPrice>): Promise<SellingPrice> {
    // Si ce prix doit être par défaut, d'abord désactiver tous les autres prix par défaut
    if (sellingPrice.isDefault) {
      // Récupérer d'abord le prix pour obtenir le presentation_id
      const { data: currentPrice, error: getError } = await supabase
        .from(SELLING_PRICES_TABLE)
        .select('presentation_id')
        .eq('id', id)
        .single();

      if (getError) {
        console.error('Error getting current price:', getError);
        throw getError;
      }

      const { error: updateError } = await supabase
        .from(SELLING_PRICES_TABLE)
        .update({ is_default: false })
        .eq('presentation_id', currentPrice.presentation_id);

      if (updateError) {
        console.error('Error updating default prices:', updateError);
        throw updateError;
      }
    }

    const { data, error } = await supabase
      .from(SELLING_PRICES_TABLE)
      .update({
        label: sellingPrice.label,
        price: sellingPrice.price,
        is_default: sellingPrice.isDefault,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating selling price:', error);
      toast.error('Erreur lors de la mise à jour du prix de vente');
      throw error;
    }

    return {
      id: data.id,
      label: data.label,
      price: data.price,
      isDefault: data.is_default,
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(SELLING_PRICES_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting selling price:', error);
      toast.error('Erreur lors de la suppression du prix de vente');
      throw error;
    }
  },

  async setDefault(id: string, presentationId: string): Promise<void> {
    // First, set all prices for this presentation to not default
    const { error: updateError } = await supabase
      .from(SELLING_PRICES_TABLE)
      .update({ is_default: false })
      .eq('presentation_id', presentationId);

    if (updateError) {
      console.error('Error updating default prices:', updateError);
      throw updateError;
    }

    // Then set the selected price as default
    const { error } = await supabase
      .from(SELLING_PRICES_TABLE)
      .update({ is_default: true })
      .eq('id', id);

    if (error) {
      console.error('Error setting default price:', error);
      toast.error('Erreur lors de la définition du prix par défaut');
      throw error;
    }
  },
}; 