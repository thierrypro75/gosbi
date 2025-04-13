import { supabase } from './supabase';
import { Client, Interaction, Task, ClientWithRelations } from '../types/crm';
import { ClientCreate, InteractionCreate, TaskCreate } from '../schemas/crm';
import { getClient } from '../../services/api';

// Clients
export const getClients = async (type?: string) => {
  let query = supabase
    .from('crm_clients')
    .select('*')
    .order('name');

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Client[];
};

export async function getClientById(id: string): Promise<ClientWithRelations | null> {
  const client = await getClient(id);
  if (!client) return null;

  // TODO: Replace with actual API calls
  return {
    ...client,
    interactions: [],
    tasks: [],
    sales: [],
    createdAt: new Date(client.createdAt),
    updatedAt: new Date(client.createdAt),
  };
}

export const createClient = async (client: ClientCreate) => {
  const { data, error } = await supabase
    .from('crm_clients')
    .insert(client)
    .select()
    .single();

  if (error) throw error;
  return data as Client;
};

export const updateClient = async (id: string, client: Partial<Client>) => {
  const { data, error } = await supabase
    .from('crm_clients')
    .update(client)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Client;
};

// Interactions
export async function getClientInteractions(clientId: string): Promise<Interaction[]> {
  // TODO: Replace with actual API call
  return [];
}

export async function createInteraction(data: {
  clientId: string;
  type: string;
  date: Date;
  notes: string;
}): Promise<Interaction> {
  // TODO: Replace with actual API call
  return {
    id: Math.random().toString(36).substr(2, 9),
    clientId: data.clientId,
    type: data.type as any,
    date: data.date,
    notes: data.notes,
    createdBy: 'current-user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Tasks
export async function getClientTasks(clientId: string): Promise<Task[]> {
  // TODO: Replace with actual API call
  return [];
}

export async function createTask(data: {
  clientId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority: string;
  status: string;
  assignedTo: string;
}): Promise<Task> {
  // TODO: Replace with actual API call
  return {
    id: Math.random().toString(36).substr(2, 9),
    clientId: data.clientId,
    title: data.title,
    description: data.description,
    dueDate: data.dueDate,
    priority: data.priority as any,
    status: data.status as any,
    assignedTo: data.assignedTo,
    createdBy: 'current-user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  // TODO: Replace with actual API call
  return {
    id,
    clientId: 'client-id',
    title: 'Task title',
    priority: 'MOYENNE',
    status: 'EN_COURS',
    assignedTo: 'current-user',
    createdBy: 'current-user',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  };
}

export const getUpcomingTasks = async () => {
  const { data, error } = await supabase
    .from('crm_tasks')
    .select('*')
    .eq('status', 'A_FAIRE')
    .gte('dueDate', new Date().toISOString())
    .order('dueDate', { ascending: true })
    .limit(10);

  if (error) throw error;
  return data as Task[];
};

// Sales
export const linkSaleToClient = async (saleId: string, clientId: string) => {
  const { data, error } = await supabase
    .from('crm_sales')
    .insert({
      saleId,
      clientId
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getClientSales = async (clientId: string) => {
  const { data, error } = await supabase
    .from('crm_sales')
    .select(`
      id,
      sale:sales(
        id,
        sale_date,
        total_amount,
        description
      )
    `)
    .eq('clientId', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}; 