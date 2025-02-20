import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockMovementService } from '../../lib/services/stockMovementService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react';

interface StockMovementHistoryProps {
  presentationId?: string;
}

const reasonLabels = {
  'INITIAL': 'Stock initial',
  'ADJUSTMENT': 'Ajustement manuel',
  'SALE': 'Vente',
  'RETURN': 'Retour',
  'CORRECTION': 'Correction'
};

export default function StockMovementHistory({ presentationId }: StockMovementHistoryProps) {
  const { data: movements, isLoading } = useQuery({
    queryKey: ['stockMovements', presentationId],
    queryFn: () => presentationId 
      ? stockMovementService.getByPresentation(presentationId)
      : stockMovementService.getAll(),
  });

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
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
  );
} 