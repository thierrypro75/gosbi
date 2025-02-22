import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockMovementService } from '../../lib/services/stockMovementService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowUpCircle, ArrowDownCircle, Table2, LineChart as LineChartIcon } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

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
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div className="max-h-[calc(70vh-120px)] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stock avant</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Entrée</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Sortie</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stock Final</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movements?.map((movement: any) => (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                        {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center text-xs font-medium">
                          {movement.quantity_in ? (
                            <ArrowUpCircle className="h-3 w-3 text-green-500 mr-1" />
                          ) : (
                            <ArrowDownCircle className="h-3 w-3 text-red-500 mr-1" />
                          )}
                          {reasonLabels[movement.reason as keyof typeof reasonLabels]}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-500">
                        {movement.stock_before}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                        {movement.quantity_in ? (
                          <span className="text-green-600">+{movement.quantity_in}</span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                        {movement.quantity_out ? (
                          <span className="text-red-600">-{movement.quantity_out}</span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                        {movement.stock_after}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 