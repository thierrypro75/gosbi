import { ClientWithRelations } from '../../../lib/types/crm';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ClientInfoProps {
  client: ClientWithRelations;
}

export default function ClientInfo({ client }: ClientInfoProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Informations de contact</h3>
            <div className="mt-2 space-y-2">
              <p>
                <span className="font-medium">Email:</span>{' '}
                {client.email || 'Non renseigné'}
              </p>
              <p>
                <span className="font-medium">Téléphone:</span>{' '}
                {client.phone || 'Non renseigné'}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium">Adresse</h3>
            <div className="mt-2 space-y-2">
              <p>{client.address || 'Non renseignée'}</p>
              <p>
                {client.postalCode} {client.city}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Informations commerciales</h3>
            <div className="mt-2 space-y-2">
              <p>
                <span className="font-medium">Commercial assigné:</span>{' '}
                {client.assignedTo || 'Non assigné'}
              </p>
              <p>
                <span className="font-medium">Date de création:</span>{' '}
                {format(new Date(client.createdAt), 'dd MMMM yyyy', {
                  locale: fr
                })}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium">Notes</h3>
            <div className="mt-2">
              <p className="whitespace-pre-wrap text-gray-600">
                {client.notes || 'Aucune note'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-medium">Statistiques</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">Interactions</p>
            <p className="mt-1 text-2xl font-semibold">
              {client.interactions.length}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">Tâches en cours</p>
            <p className="mt-1 text-2xl font-semibold">
              {client.tasks.filter((task) => task.status !== 'TERMINEE').length}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">Commandes</p>
            <p className="mt-1 text-2xl font-semibold">
              {client.sales.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 