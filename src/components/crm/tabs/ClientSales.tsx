import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getClientSales } from '../../../lib/services/crmService';
import { Euro } from 'lucide-react';

interface Sale {
  id: string;
  sale: {
    id: string;
    sale_date: string;
    total_amount: number;
    description?: string;
  };
}

interface ClientSalesProps {
  clientId: string;
}

export default function ClientSales({ clientId }: ClientSalesProps) {
  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ['client-sales', clientId],
    queryFn: () => getClientSales(clientId)
  });

  if (isLoading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h3 className="text-lg font-medium">Historique des commandes</h3>
      </div>

      <div className="space-y-4">
        {sales?.map((sale) => (
          <div
            key={sale.id}
            className="rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {format(new Date(sale.sale.sale_date), 'dd MMMM yyyy', {
                      locale: fr
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    <Euro className="h-3 w-3" />
                    {sale.sale.total_amount.toFixed(2)} €
                  </span>
                </div>
                {sale.sale.description && (
                  <p className="mt-2 text-sm text-gray-600">
                    {sale.sale.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {(!sales || sales.length === 0) && (
          <p className="text-center text-gray-500">
            Aucune commande enregistrée
          </p>
        )}
      </div>
    </div>
  );
} 