export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'VETERINAIRE' | 'PETSHOP' | 'CLIENT_FINAL';
  address?: string;
  notes?: string;
  createdAt: string;
}

export async function getClients(): Promise<Client[]> {
  // TODO: Replace with actual API call
  return [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      type: 'VETERINAIRE',
      createdAt: '2024-01-01T00:00:00.000Z'
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+0987654321',
      type: 'PETSHOP',
      createdAt: '2024-02-01T00:00:00.000Z'
    }
  ];
}

export async function getClient(id: string): Promise<Client | null> {
  const clients = await getClients();
  return clients.find(client => client.id === id) || null;
}

export async function updateClient(id: string, data: Partial<Client>): Promise<Client> {
  // TODO: Replace with actual API call
  const client = await getClient(id);
  if (!client) {
    throw new Error('Client not found');
  }
  return {
    ...client,
    ...data,
  };
}

export async function deleteClient(id: string): Promise<void> {
  // TODO: Replace with actual API call
  const client = await getClient(id);
  if (!client) {
    throw new Error('Client not found');
  }
  // Delete client logic here
} 