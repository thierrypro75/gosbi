import { Bell, Check, CheckCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockAlertService } from '../../lib/services/stockAlertService';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function StockAlerts() {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['stockAlerts'],
    queryFn: stockAlertService.getUnread,
  });

  const { mutate: markAsRead } = useMutation({
    mutationFn: stockAlertService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockAlerts'] });
    },
  });

  const { mutate: markAllAsRead } = useMutation({
    mutationFn: stockAlertService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockAlerts'] });
    },
  });

  if (isLoading) {
    return null;
  }

  if (!alerts?.length) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-lg font-medium">Alertes de stock</h3>
          </div>
          <button
            onClick={() => markAllAsRead()}
            className="text-gray-500 hover:text-gray-700"
            title="Marquer toutes les alertes comme lues"
          >
            <CheckCheck className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {alerts.map((alert: any) => (
            <div key={alert.id} className="flex items-start space-x-4 p-2 hover:bg-gray-50 rounded">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {alert.products.name} - {alert.presentations.unit}
                </p>
                <p className="text-sm text-gray-500">{alert.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: fr })}
                </p>
              </div>
              <button
                onClick={() => markAsRead(alert.id)}
                className="text-gray-400 hover:text-gray-600"
                title="Marquer comme lu"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 