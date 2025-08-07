import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, User, Mail, Phone, Building, Package, ChevronUp, ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react';
import { clientService, Client, CreateClientData } from '../lib/services/clientService';
import { saleService, Sale } from '../lib/services/saleService';
import { toast } from 'react-hot-toast';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import Offcanvas from '../components/common/Offcanvas';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Clients() {
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'email' | 'phone' | 'ca'>('ca');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
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

  const filteredAndSortedClients = useMemo(() => {
    // Filtrer les clients
    let filtered = clientsWithCA.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone?.includes(searchQuery) ||
      client.company?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Trier les clients
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'phone':
          aValue = (a.phone || '').toLowerCase();
          bValue = (b.phone || '').toLowerCase();
          break;
        case 'ca':
          aValue = a.ca;
          bValue = b.ca;
          break;
        default:
          aValue = a.ca;
          bValue = b.ca;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [clientsWithCA, searchQuery, sortField, sortDirection]);

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
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      return;
    }

    try {
      const { error } = await clientService.deleteClient(clientId);
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client supprimé avec succès');
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

  const handleSort = (field: 'name' | 'email' | 'phone' | 'ca') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
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

  return (
    <div className="flex flex-col h-screen space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button
          onClick={() => {
            resetForm();
            setIsOffcanvasOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau client
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher des clients..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner isVisible={true} message="Chargement..." />
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md flex-1 flex flex-col min-h-0">
          {/* En-tête avec colonnes triables */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
              <div className="col-span-2">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-1 hover:text-gray-900"
                >
                  <span>Nom</span>
                  {sortField === 'name' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => handleSort('email')}
                  className="flex items-center space-x-1 hover:text-gray-900"
                >
                  <span>Email</span>
                  {sortField === 'email' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => handleSort('phone')}
                  className="flex items-center space-x-1 hover:text-gray-900"
                >
                  <span>Téléphone</span>
                  {sortField === 'phone' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => handleSort('ca')}
                  className="flex items-center space-x-1 hover:text-gray-900"
                >
                  <span>CA</span>
                  {sortField === 'ca' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="col-span-2">Statut</div>
              <div className="col-span-2">Actions</div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-gray-200">
              {filteredAndSortedClients.map((client) => (
              <li key={client.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer" onClick={() => handleEdit(client)}>
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Nom et informations */}
                  <div className="col-span-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {client.name}
                        </p>
                        {client.company && (
                          <p className="text-xs text-gray-500 truncate">
                            {client.company}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="col-span-2">
                    <div className="flex items-center space-x-1">
                      {client.email ? (
                        <>
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-900 truncate">{client.email}</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </div>

                  {/* Téléphone */}
                  <div className="col-span-2">
                    <div className="flex items-center space-x-1">
                      {client.phone ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (client.phone) {
                              handleCall(client.phone);
                            }
                          }}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Appeler ce numéro"
                        >
                          <Phone className="h-3 w-3" />
                          <span className="text-sm truncate">{client.phone}</span>
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </div>

                  {/* CA */}
                  <div className="col-span-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {client.ca.toLocaleString('fr-MG')} Ar
                      </p>
                    </div>
                  </div>

                  {/* Statut */}
                  <div className="col-span-2">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(client);
                        }}
                        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          client.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                        title={client.status === 'ACTIVE' ? 'Désactiver le client' : 'Activer le client'}
                      >
                        {client.status === 'ACTIVE' ? (
                          <>
                            <ToggleRight className="h-3 w-3" />
                            <span>Actif</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-3 w-3" />
                            <span>Inactif</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(client);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(client.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            </ul>
          </div>
        </div>
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="email@exemple.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Téléphone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Nom de l'entreprise"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Adresse</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Adresse complète"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
