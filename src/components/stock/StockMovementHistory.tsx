import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockMovementService } from '../../lib/services/stockMovementService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowUpCircle, ArrowDownCircle, Table2, LineChart as LineChartIcon } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import DataTable, { type DataColumn } from '../ui/DataTable';

interface StockMovementHistoryProps {
  presentationId?: string;
}

const reasonLabels = {
  'INITIAL': 'Stock initial',
  'ADJUSTMENT': 'Ajustement manuel',
  'SALE': 'Vente',
  'RETURN': 'Retour',
  'CORRECTION': 'Correction',
  'SUPPLY': 'Approvisionnement'
};

type ViewMode = 'table' | 'chart';

const formatMovementDate = (movement: any) =>
  format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: fr });

const movementLabel = (movement: any) => reasonLabels[movement.reason as keyof typeof reasonLabels] ?? movement.reason;

const movementColumns: DataColumn<any>[] = [
  {
    id: 'date',
    header: 'Date',
    width: 150,
    sticky: 'left',
    cell: (m) => <span className="text-muted">{formatMovementDate(m)}</span>,
    search: formatMovementDate,
  },
  {
    id: 'type',
    header: 'Type',
    width: 190,
    cell: (m) => (
      <span className="inline-flex items-center font-medium">
        {m.quantity_in ? (
          <ArrowUpCircle className="h-4 w-4 text-green-500 mr-1.5" aria-hidden="true" />
        ) : (
          <ArrowDownCircle className="h-4 w-4 text-red-500 mr-1.5" aria-hidden="true" />
        )}
        {movementLabel(m)}
      </span>
    ),
    search: movementLabel,
  },
  { id: 'before', header: 'Stock avant', width: 120, align: 'right', cell: (m) => <span className="tabular-nums text-muted">{m.stock_before}</span> },
  {
    id: 'in',
    header: 'Entrée',
    width: 100,
    align: 'right',
    cell: (m) => (m.quantity_in ? <span className="tabular-nums text-green-600">+{m.quantity_in}</span> : '—'),
  },
  {
    id: 'out',
    header: 'Sortie',
    width: 100,
    align: 'right',
    cell: (m) => (m.quantity_out ? <span className="tabular-nums text-red-600">-{m.quantity_out}</span> : '—'),
  },
  {
    id: 'after',
    header: 'Stock final',
    width: 120,
    sticky: 'right',
    align: 'right',
    cell: (m) => <span className="font-medium tabular-nums">{m.stock_after}</span>,
  },
];

export default function StockMovementHistory({ presentationId }: StockMovementHistoryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const { data: movements, isLoading } = useQuery({
    queryKey: ['stockMovements', presentationId],
    queryFn: () => presentationId 
      ? stockMovementService.getByPresentation(presentationId)
      : stockMovementService.getAll(),
  });

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  // Préparer les données pour le graphique
  const chartData = movements?.map(movement => ({
    date: format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }),
    stock: movement.stock_after,
  })).reverse();

  return (
    <div className="space-y-4">
      {/* Boutons de navigation */}
      <div className="flex space-x-2">
        <button
          onClick={() => setViewMode('table')}
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
            viewMode === 'table'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Table2 className="h-4 w-4 mr-2" />
          Tableau
        </button>
        <button
          onClick={() => setViewMode('chart')}
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
            viewMode === 'chart'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <LineChartIcon className="h-4 w-4 mr-2" />
          Graphique
        </button>
      </div>

      {/* Contenu */}
      {viewMode === 'chart' ? (
        <div className="bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Évolution du stock</h3>
          <div className="h-[calc(70vh-120px)]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  angle={-90}
                  textAnchor="end"
                  height={80}
                  interval={chartData ? Math.floor(chartData.length / 5) : 0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip />
                <Line
                  type="stepAfter"
                  dataKey="stock"
                  stroke="#3B82F6"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <DataTable<any>
          rows={movements ?? []}
          rowKey={(m) => String(m.id)}
          label="mouvements"
          caption="Historique des mouvements de stock"
          searchPlaceholder="Date, type de mouvement…"
          emptyMessage="Aucun mouvement de stock enregistré."
          columns={movementColumns}
          scrollClassName="max-h-[calc(70vh-200px)] min-h-[10rem]"
        />
      )}
    </div>
  );
} 