import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supplyService } from '../lib/services/supplyService';
import { Supply, SupplyStatus } from '../lib/schemas/supply';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, PackageCheck, PackageX, Package, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import DataTable, { SearchInput, type DataColumn } from '../components/ui/DataTable';

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

const formatSupplyDate = (supply: Supply) =>
  supply.created_at ? format(new Date(supply.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : 'Date inconnue';

const getQuantities = (supply: Supply) => {
  const received = supply.lines.reduce((sum, line: any) =>
    sum + (typeof line.received_quantity !== 'undefined' ? line.received_quantity : line.receivedQuantity || 0)
  , 0);
  const ordered = supply.lines.reduce((sum, line: any) =>
    sum + (typeof line.ordered_quantity !== 'undefined' ? line.ordered_quantity : line.orderedQuantity || 0)
  , 0);
  return { received: received || 0, ordered: ordered || 0 };
};

const canDeleteSupply = (supply: Supply) => supply.status === 'COMMANDE_INITIEE' || supply.lines.length === 0;

function StatusBadge({ status }: { status: SupplyStatus }) {
  const { label, color, icon: Icon } = statusLabels[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-4 h-4 mr-1" aria-hidden="true" />
      {label}
    </span>
  );
}

export default function Supplies() {
  const [search, setSearch] = useState('');
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

  const columns: DataColumn<Supply>[] = [
    {
      id: 'date',
      header: 'Date',
      width: 160,
      sticky: 'left',
      sort: (supply) => (supply.created_at ? new Date(supply.created_at).getTime() : 0),
      cell: (supply) => formatSupplyDate(supply),
      search: (supply) => formatSupplyDate(supply),
    },
    {
      id: 'status',
      header: 'Statut',
      width: 220,
      sort: (supply) => statusLabels[supply.status].label,
      cell: (supply) => <StatusBadge status={supply.status} />,
      search: (supply) => statusLabels[supply.status].label,
    },
    {
      id: 'products',
      header: 'Produits',
      width: 260,
      cell: (supply) => {
        const names = [...new Set(supply.lines.map((l) => l.product?.name).filter(Boolean))];
        return <span className="text-muted">{names.length ? names.join(', ') : '–'}</span>;
      },
      search: (supply) =>
        supply.lines
          .map((l) => `${l.product?.name ?? ''} ${l.product?.category ?? ''} ${l.presentation?.unit ?? ''}`)
          .join(' '),
    },
    {
      id: 'description',
      header: 'Description',
      cell: (supply) => <span className="text-muted">{supply.description || '–'}</span>,
      search: (supply) => supply.description,
    },
    {
      id: 'lines',
      header: 'Lignes',
      width: 96,
      align: 'right',
      sort: (supply) => supply.lines.length,
      cell: (supply) => <span className="tabular-nums">{supply.lines.length}</span>,
    },
    {
      id: 'received',
      header: 'Reçus',
      width: 112,
      align: 'right',
      sort: (supply) => getQuantities(supply).received,
      cell: (supply) => {
        const { received, ordered } = getQuantities(supply);
        return <span className="tabular-nums">{received} / {ordered}</span>;
      },
    },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      width: 104,
      sticky: 'right',
      align: 'right',
      cell: (supply) => (
        <div className="flex justify-end gap-1">
          <Link
            to={`/supplies/${supply.id}/receive`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-accent-ink transition-colors hover:bg-accent-soft"
            title="Éditer"
            aria-label="Éditer la commande"
          >
            <Pencil className="h-[18px] w-[18px]" aria-hidden="true" />
          </Link>
          {canDeleteSupply(supply) && (
            <button
              type="button"
              onClick={() => handleDelete(supply.id)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
              title="Supprimer"
              aria-label="Supprimer la commande"
            >
              <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="flex flex-col gap-6 md:h-[calc(100dvh-3rem)]">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Approvisionnements</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Date, statut, produit…"
            label="Rechercher parmi les approvisionnements"
            className="sm:w-72"
          />
          <Link
            to="/supplies/new"
            className="flex items-center justify-center whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle commande
          </Link>
        </div>
      </div>

      <DataTable<Supply>
        rows={supplies}
        rowKey={(supply) => String(supply.id)}
        label="approvisionnements"
        caption="Liste des approvisionnements"
        query={search}
        onQueryChange={setSearch}
        hideSearch
        fill
        defaultSort={{ id: 'date', dir: 'desc' }}
        pageSize={25}
        emptyMessage="Aucun approvisionnement trouvé."
        columns={columns}
        mobile={{
          render: (supply) => {
            const { received, ordered } = getQuantities(supply);
            return (
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted">{formatSupplyDate(supply)}</span>
                  <StatusBadge status={supply.status} />
                </div>
                {supply.description && <p className="text-sm text-muted">{supply.description}</p>}
                <div className="flex justify-between text-sm text-ink">
                  <span>Lignes : {supply.lines.length}</span>
                  <span>Reçus : {received} / {ordered}</span>
                </div>
                <div className="flex justify-end gap-1">
                  <Link
                    to={`/supplies/${supply.id}/receive`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-accent-ink hover:bg-accent-soft"
                    title="Éditer"
                    aria-label="Éditer la commande"
                  >
                    <Pencil className="h-5 w-5" aria-hidden="true" />
                  </Link>
                  {canDeleteSupply(supply) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(supply.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
                      title="Supprimer"
                      aria-label="Supprimer la commande"
                    >
                      <Trash2 className="h-5 w-5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          },
        }}
      />

      <LoadingSpinner
        isVisible={deleteMutation.isPending}
        message="Suppression en cours..."
      />
    </div>
  );
}
