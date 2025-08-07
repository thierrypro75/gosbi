import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supplyService } from '../lib/services/supplyService';
import { Supply, SupplyStatus } from '../lib/schemas/supply';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Search, PackageCheck, PackageX, Package, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

const statusLabels: Record<SupplyStatus, { label: string; color: string; icon: any }> = {
  'COMMANDE_INITIEE': { 
    label: 'Commande initiée', 
    color: 'bg-blue-100 text-blue-800',
    icon: Package
  },
  'RECEPTIONNE': { 
    label: 'Réceptionné', 
    color: 'bg-green-100 text-green-800',
    icon: PackageCheck
  },
  'PARTIELLEMENT_RECEPTIONNE': { 
    label: 'Partiellement réceptionné', 
    color: 'bg-yellow-100 text-yellow-800',
    icon: PackageCheck
  },
  'NON_RECEPTIONNE': { 
    label: 'Non réceptionné', 
    color: 'bg-red-100 text-red-800',
    icon: PackageX
  }
};

export default function Supplies() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: supplies = [], isLoading } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => supplyService.getAll()
  });

  const deleteMutation = useMutation({
    mutationFn: supplyService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      toast.success('Commande supprimée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression: ' + error.message);
    }
  });

  const handleDelete = async (id: string | undefined) => {
    if (!id) return;
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  // Filtrer les approvisionnements
  const filteredSupplies = supplies.filter((supply: Supply) => {
    const searchLower = searchTerm.toLowerCase();
    
    // Recherche dans la date
    const date = supply.created_at 
      ? format(new Date(supply.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }).toLowerCase()
      : '';

    // Recherche dans le statut
    const statusLabel = statusLabels[supply.status].label.toLowerCase();

    return (
      date.includes(searchLower) ||
      statusLabel.includes(searchLower) ||
      supply.description?.toLowerCase().includes(searchLower) ||
      supply.lines.some(line => 
        line.product?.name.toLowerCase().includes(searchLower) ||
        line.product?.category.toLowerCase().includes(searchLower) ||
        line.presentation?.unit.toLowerCase().includes(searchLower)
      )
    );
  });

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-2">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Approvisionnements</h1>
        <Link
          to="/supplies/new"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouvelle commande
        </Link>
      </div>

      {/* Barre de recherche */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un approvisionnement..."
          className="w-full pl-10 pr-4 py-2 border rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Liste des approvisionnements */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lignes
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reçus
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSupplies.map((supply: Supply) => {
                const status = statusLabels[supply.status];
                const StatusIcon = status.icon;
                const totalProducts = supply.lines.length;
                const receivedQuantity = supply.lines.reduce((sum, line: any) => 
                  sum + (typeof line.received_quantity !== 'undefined' ? line.received_quantity : line.receivedQuantity || 0)
                , 0);
                const totalQuantity = supply.lines.reduce((sum, line: any) => 
                  sum + (typeof line.ordered_quantity !== 'undefined' ? line.ordered_quantity : line.orderedQuantity || 0)
                , 0);
                const canDelete = supply.status === 'COMMANDE_INITIEE' || totalProducts === 0;

                return (
                  <tr key={supply.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {supply.created_at ? format(new Date(supply.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : 'Date inconnue'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className="w-4 h-4 mr-1" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {supply.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {totalProducts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {receivedQuantity || 0} / {totalQuantity || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/supplies/${supply.id}/receive`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Éditer"
                        >
                          <Pencil className="h-5 w-5" />
                        </Link>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(supply.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Supprimer"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vue mobile */}
      <div className="md:hidden grid gap-4">
        {filteredSupplies.map((supply: Supply) => {
          const status = statusLabels[supply.status];
          const StatusIcon = status.icon;
          const totalProducts = supply.lines.length;
          const receivedQuantity = supply.lines.reduce((sum, line: any) => 
            sum + (typeof line.received_quantity !== 'undefined' ? line.received_quantity : line.receivedQuantity || 0)
          , 0);
          const totalQuantity = supply.lines.reduce((sum, line: any) => 
            sum + (typeof line.ordered_quantity !== 'undefined' ? line.ordered_quantity : line.orderedQuantity || 0)
          , 0);
          const canDelete = supply.status === 'COMMANDE_INITIEE' || totalProducts === 0;

          return (
            <div key={supply.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {supply.created_at ? format(new Date(supply.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : 'Date inconnue'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                  <StatusIcon className="w-4 h-4 mr-1" />
                  {status.label}
                </span>
              </div>
              
              {supply.description && (
                <p className="text-sm text-gray-600">{supply.description}</p>
              )}

              <div className="flex justify-between text-sm">
                <span>Lignes: {totalProducts}</span>
                <span>Reçus: {receivedQuantity || 0} / {totalQuantity || 0}</span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Link
                  to={`/supplies/${supply.id}/receive`}
                  className="text-blue-600 hover:text-blue-900"
                  title="Éditer"
                >
                  <Pencil className="h-5 w-5" />
                </Link>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(supply.id)}
                    className="text-red-600 hover:text-red-900"
                    title="Supprimer"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredSupplies.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Aucun approvisionnement trouvé
        </div>
      )}
      
      {/* Loading Spinner */}
      <LoadingSpinner 
        isVisible={deleteMutation.isPending} 
        message="Suppression en cours..."
      />
    </div>
  );
}