import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { getClient, updateClient, deleteClient } from '../../services/api';
import { getClientById } from '../../lib/services/crmService';
import { ClientWithRelations } from '../../lib/types/crm';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Composants des onglets
import ClientInfo from './tabs/ClientInfo';
import ClientInteractions from './tabs/ClientInteractions';
import ClientTasks from './tabs/ClientTasks';
import ClientSales from './tabs/ClientSales';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('info');

  const { data: client, isLoading } = useQuery<ClientWithRelations>({
    queryKey: ['client', id],
    queryFn: () => getClientById(id!),
    enabled: !!id
  });

  if (isLoading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  if (!client) {
    return <div className="p-8 text-center text-red-600">Client non trouvé</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{client.name}</h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
            {client.type === 'VETERINAIRE' && (
              <span className="bg-purple-100 text-purple-800">Vétérinaire</span>
            )}
            {client.type === 'PETSHOP' && (
              <span className="bg-green-100 text-green-800">PetShop</span>
            )}
            {client.type === 'CLIENT_FINAL' && (
              <span className="bg-blue-100 text-blue-800">Client final</span>
            )}
          </span>
          <span>Client depuis {format(new Date(client.createdAt), 'MMMM yyyy', { locale: fr })}</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
          <TabsTrigger value="tasks">Tâches</TabsTrigger>
          <TabsTrigger value="sales">Commandes</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <ClientInfo client={client} />
        </TabsContent>

        <TabsContent value="interactions">
          <ClientInteractions clientId={client.id} />
        </TabsContent>

        <TabsContent value="tasks">
          <ClientTasks clientId={client.id} />
        </TabsContent>

        <TabsContent value="sales">
          <ClientSales clientId={client.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 