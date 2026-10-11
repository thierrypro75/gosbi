import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, User, Mail, Phone, Package, ToggleLeft, ToggleRight } from 'lucide-react';
import { clientService, Client, CreateClientData } from '../lib/services/clientService';
import { saleService, Sale } from '../lib/services/saleService';
import { toast } from 'react-hot-toast';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import Offcanvas from '../components/common/Offcanvas';
import DataTable, { SearchInput, type DataColumn } from '../components/ui/DataTable';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Clients() {
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<CreateClientData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    notes: ''
  });

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await clientService.getAllClients();
      if (error) throw error;
      return data || [];
    }
  });

  // Requête pour récupérer l'historique des achats du client en cours d'édition
  const { data: clientSales = [] } = useQuery<Sale[]>({
    queryKey: ['client-sales', editingClient?.id],
    queryFn: async () => {
      if (!editingClient?.id) return [];
      const { data, error } = await saleService.getSalesByClient(editingClient.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!editingClient?.id
  });

  // Requête pour récupérer toutes les ventes pour calculer les CA
  const { data: allSales = [] } = useQuery<Sale[]>({
    queryKey: ['all-sales'],
    queryFn: async () => {
      const { data, error } = await saleService.getSales();
      if (error) throw error;
      return data || [];
    }
  });

  // Calculer le CA pour chaque client
  const clientsWithCA = useMemo(() => {
    return clients.map(client => {
      const clientSales = allSales.filter(sale => 
        sale.client_id === client.id && sale.status === 'ACTIVE'
      );
      const totalCA = clientSales.reduce((total, sale) => total + sale.total_amount, 0);
      return {
        ...client,
        ca: totalCA
      };
    });
  }, [clients, allSales]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      notes: ''
    });
    setEditingClient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Le nom du client est requis');
      return;
    }

    setLoading(true);
    try {
      if (editingClient) {
        const { error } = await clientService.updateClient(editingClient.id, formData);
        if (error) throw error;
        toast.success('Client mis à jour avec succès');
      } else {
        const { error } = await clientService.createClient(formData);
        if (error) throw error;
        toast.success('Client créé avec succès');
      }

      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsOffcanvasOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Erreur lors de l\'enregistrement du client');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      address: client.address || '',
      notes: client.notes || ''
    });
    setIsOffcanvasOpen(true);
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?\n\nNote : Si le client a des ventes associées, il sera désactivé au lieu d\'être supprimé.')) {
      return;
    }

    try {
      const { error } = await clientService.deleteClient(clientId);
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client supprimé ou désactivé avec succès');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Erreur lors de la suppression du client');
    }
  };

  const handleCall = (phoneNumber: string) => {
    // Nettoyer le numéro de téléphone (supprimer les espaces et caractères spéciaux)
    const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Vérifier si c'est un numéro malgache
    let formattedNumber = cleanPhoneNumber;
    if (cleanPhoneNumber.startsWith('0')) {
      // Convertir le format local en format international
      formattedNumber = '+261' + cleanPhoneNumber.substring(1);
    } else if (cleanPhoneNumber.startsWith('261')) {
      // Ajouter le + si manquant
      formattedNumber = '+' + cleanPhoneNumber;
    } else if (!cleanPhoneNumber.startsWith('+')) {
      // Ajouter le préfixe international si aucun préfixe n'est présent
      formattedNumber = '+261' + cleanPhoneNumber;
    }
    
    // Lancer l'appel
    window.open(`tel:${formattedNumber}`, '_self');
  };

  const handleToggleStatus = async (client: Client) => {
    const newStatus = client.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const action = newStatus === 'ACTIVE' ? 'activé' : 'désactivé';
    
    try {
      const { error } = await clientService.updateClient(client.id, { status: newStatus } as any);
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`Client ${action} avec succès`);
    } catch (error) {
      console.error('Error updating client status:', error);
      toast.error(`Erreur lors de la ${action === 'activé' ? 'activation' : 'désactivation'} du client`);
    }
  };

  type ClientRow = Client & { ca: number };

  const iconButton = 'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors';

  const columns: DataColumn<ClientRow>[] = [
    {
      id: 'name',
      header: 'Nom',
      width: 240,
      sticky: 'left',
      sort: (c) => c.name,
      search: (c) => `${c.name} ${c.company ?? ''}`,
      cell: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft">
            <User className="h-4 w-4 text-accent-ink" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{c.name}</p>
            {c.company && <p className="truncate text-xs text-muted">{c.company}</p>}
          </div>
        </div>
      ),
    },
    {
      id: 'email',
      header: 'Email',
      width: 250,
      sort: (c) => c.email || '',
      search: (c) => c.email,
      cell: (c) =>
        c.email ? (
          <span className="inline-flex max-w-full items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden="true" />
            <span className="truncate">{c.email}</span>
          </span>
        ) : (
          <span className="text-subtle">–</span>
        ),
    },
    {
      id: 'phone',
      header: 'Téléphone',
      width: 170,
      sort: (c) => c.phone || '',
      search: (c) => c.phone,
      cell: (c) =>
        c.phone ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCall(c.phone!);
            }}
            className="inline-flex items-center gap-1.5 rounded text-accent-ink hover:underline"
            title="Appeler ce numéro"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {c.phone}
          </button>
        ) : (
          <span className="text-subtle">–</span>
        ),
    },
    {
      id: 'ca',
      header: 'CA',
      width: 170,
      align: 'right',
      sort: (c) => c.ca,
      cell: (c) => <span className="font-medium tabular-nums">{c.ca.toLocaleString('fr-MG')} Ar</span>,
      footer: (rows) => (
        <span className="tabular-nums text-accent-ink">
          {rows.reduce((sum, c) => sum + c.ca, 0).toLocaleString('fr-MG')} Ar
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Statut',
      width: 140,
      align: 'center',
      sort: (c) => (c.status === 'ACTIVE' ? 1 : 0),
      cell: (c) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleStatus(c);
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            c.status === 'ACTIVE'
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
          title={c.status === 'ACTIVE' ? 'Désactiver le client' : 'Activer le client'}
        >
          {c.status === 'ACTIVE' ? (
            <ToggleRight className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ToggleLeft className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {c.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
        </button>
      ),
    },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      width: 104,
      sticky: 'right',
      align: 'right',
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(c);
            }}
            className={`${iconButton} text-accent-ink hover:bg-accent-soft`}
            title="Modifier"
            aria-label={`Modifier ${c.name}`}
          >
            <Edit className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(c.id);
            }}
            className={`${iconButton} text-red-600 hover:bg-red-50 hover:text-red-700`}
            title="Supprimer"
            aria-label={`Supprimer ${c.name}`}
          >
            <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 md:h-[calc(100dvh-3rem)]">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Clients</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Nom, email, téléphone…"
            label="Rechercher parmi les clients"
            className="sm:w-72"
          />
          <button
            onClick={() => {
              resetForm();
              setIsOffcanvasOpen(true);
            }}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau client
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner isVisible={true} message="Chargement..." />
        </div>
      ) : (
        <DataTable<ClientRow>
          rows={clientsWithCA}
          rowKey={(c) => c.id}
          label="clients"
          caption="Liste des clients"
          query={searchQuery}
          onQueryChange={setSearchQuery}
          hideSearch
          fill
          footerLabel="CA cumulé"
          defaultSort={{ id: 'ca', dir: 'desc' }}
          onRowClick={handleEdit}
          emptyMessage="Aucun client enregistré."
          columns={columns}
          mobile={{
            render: (c) => (
              <div className="flex items-start gap-3 p-4" onClick={() => handleEdit(c)}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                  <User className="h-4 w-4 text-accent-ink" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{c.name}</p>
                  {c.company && <p className="truncate text-xs text-muted">{c.company}</p>}
                  <p className="mt-1 text-sm text-muted">{c.email || c.phone || '–'}</p>
                  <p className="mt-1 text-sm font-medium tabular-nums text-ink">
                    {c.ca.toLocaleString('fr-MG')} Ar
                  </p>
                </div>
                <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(c)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      c.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {c.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className={`${iconButton} text-red-600 hover:bg-red-50`}
                    aria-label={`Supprimer ${c.name}`}
                  >
                    <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ),
          }}
        />
      )}

      <Offcanvas
        isOpen={isOffcanvasOpen}
        onClose={() => {
          setIsOffcanvasOpen(false);
          resetForm();
        }}
        title={editingClient ? 'Modifier le client' : 'Nouveau client'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nom *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              required
              placeholder="Nom du client"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                placeholder="email@exemple.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Téléphone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                placeholder="+261 34 12 345 67"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Entreprise</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              placeholder="Nom de l'entreprise"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Adresse</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              placeholder="Adresse complète"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              placeholder="Informations supplémentaires sur le client"
            />
          </div>

          {/* Historique des achats */}
          {editingClient && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-900">Historique des achats</h3>
                </div>
                {clientSales.length > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total des achats</p>
                    <p className="text-lg font-bold text-green-600">
                      {clientSales
                        .filter(sale => sale.status === 'ACTIVE')
                        .reduce((total, sale) => total + sale.total_amount, 0)
                        .toLocaleString('fr-MG')} Ar
                    </p>
                  </div>
                )}
              </div>
              
              {clientSales.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Package className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>Aucun achat enregistré pour ce client</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {clientSales.map((sale) => (
                    <div key={sale.id} className="bg-gray-50 rounded-lg p-3 border">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {sale.product?.name || 'Produit inconnu'}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {sale.quantity} {sale.presentation?.unit} • {sale.unit_price.toLocaleString('fr-MG')} Ar/unité
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(sale.sale_date).toLocaleDateString('fr-MG', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {sale.total_amount.toLocaleString('fr-MG')} Ar
                          </p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            sale.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {sale.status === 'ACTIVE' ? 'Validé' : 'Annulé'}
                          </span>
                        </div>
                      </div>
                      {sale.description && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Note :</span> {sale.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsOffcanvasOpen(false);
                resetForm();
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : (editingClient ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </Offcanvas>

      <LoadingSpinner isVisible={loading} message="Enregistrement..." />
    </div>
  );
}
