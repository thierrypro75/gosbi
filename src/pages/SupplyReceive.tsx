import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplyService } from '../lib/services/supplyService';
import { Supply, SupplyLine, SupplyLineStatus } from '../lib/schemas/supply';
import { toast } from 'react-hot-toast';
import { ChevronLeft, PackageCheck, PackageX } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReceiptLine extends SupplyLine {
  receivedQuantity: number;
  ordered_quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  status: SupplyLineStatus;
}

export default function SupplyReceive() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [receiptLines, setReceiptLines] = useState<ReceiptLine[]>([]);

  // Charger l'approvisionnement
  const { data: supply, isLoading } = useQuery<Supply>({
    queryKey: ['supplies', id],
    queryFn: async () => {
      const data = await supplyService.getById(id!);
      console.log('Raw data from API:', data);
      return data;
    }
  });

  // Initialiser les lignes de réception quand les données sont chargées
  useEffect(() => {
    if (supply && !receiptLines.length) {
      console.log('Supply data:', supply);
      console.log('Supply lines:', supply.lines);
      supply.lines.forEach((line: any, index) => {
        console.log(`Line ${index + 1}:`, {
          id: line.id,
          orderedQuantity: line.orderedQuantity,
          ordered_quantity: line.ordered_quantity,
          receivedQuantity: line.receivedQuantity,
          received_quantity: line.received_quantity,
          product: line.product,
          presentation: line.presentation
        });
      });
      setReceiptLines(
        supply.lines.map((line: any) => {
          return {
            ...line,
            ordered_quantity: line.ordered_quantity,
            receivedQuantity: line.received_quantity || line.ordered_quantity,
            purchasePrice: line.purchase_price || 0,
            sellingPrice: line.selling_price || 0,
            status: line.received_quantity === 0 ? 'RECEPTIONNE' : line.status
          };
        })
      );
    }
  }, [supply]);

  // Mutation pour mettre à jour une ligne
  const updateLineMutation = useMutation({
    mutationFn: (line: ReceiptLine) => 
      supplyService.updateLine(line.id!, {
        receivedQuantity: line.receivedQuantity,
        purchasePrice: line.purchasePrice,
        sellingPrice: line.sellingPrice,
        status: line.status
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      toast.success('Ligne mise à jour avec succès');
    }
  });

  const handleQuantityChange = (index: number, value: number) => {
    const newLines = [...receiptLines];
    const line = newLines[index];
    line.receivedQuantity = value;

    // Mettre à jour le statut en fonction de la quantité reçue
    if (value === 0) {
      line.status = 'NON_RECEPTIONNE';
    } else if (value >= line.ordered_quantity) {
      line.status = 'RECEPTIONNE';
    } else {
      line.status = 'PARTIELLEMENT_RECEPTIONNE';
    }

    setReceiptLines(newLines);
  };

  const handlePriceChange = (index: number, field: 'purchasePrice' | 'sellingPrice', value: number) => {
    const newLines = [...receiptLines];
    newLines[index][field] = value;
    setReceiptLines(newLines);
  };

  const handleSubmit = async () => {
    try {
      // Mettre à jour chaque ligne
      await Promise.all(
        receiptLines.map(line => updateLineMutation.mutateAsync(line))
      );

      toast.success('Réception enregistrée avec succès');
      navigate('/supplies');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement de la réception');
    }
  };

  if (isLoading || !supply) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/supplies')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Retour aux approvisionnements
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Réception de la commande du {format(new Date(supply.created_at!), 'dd/MM/yyyy HH:mm', { locale: fr })}
          </h1>
          {supply.description && (
            <p className="mt-2 text-gray-600">{supply.description}</p>
          )}
        </div>

        <div className="space-y-6">
          {receiptLines.map((line, index) => (
            <div key={line.id} className="border rounded-lg p-4">
              {/* En-tête avec nom du produit et présentation */}
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-medium">{line.product?.name}</h3>
                <span className="text-sm text-gray-600">({line.presentation?.unit})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* Quantité commandée et reçue */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Quantité reçue
                    </label>
                    <span className="text-sm text-gray-600">
                      Commandé : {line.ordered_quantity}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={line.ordered_quantity}
                    value={line.receivedQuantity}
                    onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                {/* Prix d'achat */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prix d'achat
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.purchasePrice}
                    onChange={(e) => handlePriceChange(index, 'purchasePrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                {/* Prix de vente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prix de vente
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.sellingPrice}
                    onChange={(e) => handlePriceChange(index, 'sellingPrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    État
                  </label>
                  <span
                    className={`inline-flex items-center px-2.5 py-2 rounded-md text-sm font-medium w-full ${
                      line.status === 'RECEPTIONNE'
                        ? 'bg-green-100 text-green-800'
                        : line.status === 'PARTIELLEMENT_RECEPTIONNE'
                        ? 'bg-yellow-100 text-yellow-800'
                        : line.status === 'NON_RECEPTIONNE'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {line.status === 'RECEPTIONNE' && <PackageCheck className="w-4 h-4 mr-1" />}
                    {line.status === 'NON_RECEPTIONNE' && <PackageX className="w-4 h-4 mr-1" />}
                    {line.status === 'RECEPTIONNE'
                      ? 'Réceptionné'
                      : line.status === 'PARTIELLEMENT_RECEPTIONNE'
                      ? 'Partiellement reçu'
                      : line.status === 'NON_RECEPTIONNE'
                      ? 'Non reçu'
                      : 'En attente'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/supplies')}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Valider la réception
          </button>
        </div>
      </div>
    </div>
  );
} 