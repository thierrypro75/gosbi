import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

export interface StockAlert {
  id: string;
  product_id: string;
  presentation_id: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK';
  message: string;
  is_read: boolean;
  created_at: string;
}

const ALERTS_TABLE = 'stock_alerts';

export const stockAlertService = {
  async getAll() {
    const { data, error } = await supabase
      .from(ALERTS_TABLE)
      .select(`
        *,
        products (
          name
        ),
        presentations (
          unit,
          stock,
          low_stock_threshold
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erreur lors du chargement des alertes');
      throw error;
    }

    return data;
  },

  async getUnread() {
    const { data, error } = await supabase
      .from(ALERTS_TABLE)
      .select(`
        *,
        products (
          name
        ),
        presentations (
          unit,
          stock,
          low_stock_threshold
        )
      `)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erreur lors du chargement des alertes');
      throw error;
    }

    return data;
  },

  async markAsRead(alertId: string) {
    const { error } = await supabase
      .from(ALERTS_TABLE)
      .update({ is_read: true })
      .eq('id', alertId);

    if (error) {
      toast.error('Erreur lors de la mise à jour de l\'alerte');
      throw error;
    }
  },

  async markAllAsRead() {
    const { error } = await supabase
      .from(ALERTS_TABLE)
      .update({ is_read: true })
      .eq('is_read', false);

    if (error) {
      toast.error('Erreur lors de la mise à jour des alertes');
      throw error;
    }
  },

  async createAlert(alert: Omit<StockAlert, 'id' | 'created_at' | 'is_read'>) {
    const { error } = await supabase
      .from(ALERTS_TABLE)
      .insert([{
        ...alert,
        is_read: false,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      toast.error('Erreur lors de la création de l\'alerte');
      throw error;
    }
  }
}; 