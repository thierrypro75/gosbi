import { supabase } from '../supabaseClient';

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClientData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  notes?: string;
}

export const clientService = {
  async getAllClients(): Promise<{ data: Client[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching clients:', error);
      return { data: null, error: error as Error };
    }
  },

  async getActiveClients(): Promise<{ data: Client[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('name');

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching active clients:', error);
      return { data: null, error: error as Error };
    }
  },

  async getClientById(id: string): Promise<{ data: Client | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching client:', error);
      return { data: null, error: error as Error };
    }
  },

  async createClient(clientData: CreateClientData): Promise<{ data: Client | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...clientData,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating client:', error);
      return { data: null, error: error as Error };
    }
  },

  async updateClient(id: string, clientData: Partial<CreateClientData>): Promise<{ data: Client | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update({
          ...clientData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating client:', error);
      return { data: null, error: error as Error };
    }
  },

  async deleteClient(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting client:', error);
      return { error: error as Error };
    }
  },

  async searchClients(query: string): Promise<{ data: Client[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .eq('status', 'ACTIVE')
        .order('name')
        .limit(10);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error searching clients:', error);
      return { data: null, error: error as Error };
    }
  },

  async getOrCreateClient(name: string, email?: string, phone?: string): Promise<{ data: Client | null; error: Error | null }> {
    try {
      // D'abord, essayer de trouver le client existant
      const { data: existingClient, error: searchError } = await supabase
        .from('clients')
        .select('*')
        .eq('name', name)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }

      if (existingClient) {
        return { data: existingClient, error: null };
      }

      // Si le client n'existe pas, le créer
      return await this.createClient({ name, email, phone });
    } catch (error) {
      console.error('Error getting or creating client:', error);
      return { data: null, error: error as Error };
    }
  }
};
