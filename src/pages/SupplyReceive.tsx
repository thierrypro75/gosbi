import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplyService } from '../lib/services/supplyService';
import { Supply, SupplyLine, SupplyLineStatus } from '../lib/schemas/supply';
import { toast } from 'react-hot-toast';
import { ChevronLeft, PackageCheck, PackageX } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import LoadingSpinner from '../components/common/LoadingSpinner';
import DataTable, { type DataColumn } from '../components/ui/DataTable';

interface ReceiptLine extends SupplyLine {
  receivedQuantity: number;  // quantité déjà reçue
  newQuantity: number;       // quantité à recevoir maintenant
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
      setReceiptLines(
        supply.lines.map((line: any) => ({
          ...line,
          ordered_quantity: line.ordered_quantity,
          receivedQuantity: line.received_quantity || 0,
          newQuantity: line.ordered_quantity - (line.received_quantity || 0),  // Initialiser à la différence
          purchasePrice: line.purchase_price || 0,
          sellingPrice: line.selling_price || 0,
          status: line.status || 'EN_ATTENTE'
        }))
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
    line.newQuantity = value;

    const totalReceived = line.receivedQuantity + value;

    // Mettre à jour le statut en fonction de la quantité totale reçue
    if (totalReceived === 0) {
      line.status = 'NON_RECEPTIONNE';
    } else if (totalReceived >= line.ordered_quantity) {
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
      await Promise.all(
        receiptLines.map(line => updateLineMutation.mutateAsync({
          ...line,
          receivedQuantity: line.receivedQuantity + (line.newQuantity || 0)
        }))
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

  const statusStyles = (status: SupplyLineStatus) =>
    status === 'RECEPTIONNE'
      ? 'bg-green-100 text-green-800'
      : status === 'PARTIELLEMENT_RECEPTIONNE'
      ? 'bg-yellow-100 text-yellow-800'
      : status === 'NON_RECEPTIONNE'
      ? 'bg-red-100 text-red-800'
      : 'bg-gray-100 text-gray-800';

  const receiptColumns: DataColumn<ReceiptLine>[] = [
    {
      id: 'product',
      header: 'Produit',
      width: 280,
      sticky: 'left',
      wrap: true,
      cell: (line) => (
        <>
          <div className="font-medium">{line.product?.name}</div>
          <div className="text-sm text-muted">{line.presentation?.unit}</div>
        </>
      ),
      search: (line) => `${line.product?.name ?? ''} ${line.presentation?.unit ?? ''}`,
    },
    { id: 'ordered', header: 'Commandé', width: 120, align: 'right', cell: (line) => <span className="tabular-nums text-muted">{line.ordered_quantity}</span> },
    { id: 'received', header: 'Déjà reçu', width: 120, align: 'right', cell: (line) => <span className="tabular-nums text-muted">{line.receivedQuantity}</span> },
    {
      id: 'incoming',
      header: 'À recevoir',
      width: 130,
      align: 'right',
      cell: (line) => {
        const index = receiptLines.indexOf(line);
        const remaining = line.ordered_quantity - line.receivedQuantity;
        return remaining === 0 ? (
          <span className="tabular-nums text-muted">0</span>
        ) : (
          <input
            type="number"
            min="0"
            max={remaining}
            value={line.newQuantity}
            onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
            className="w-24 px-2 py-1 text-right border rounded-md"
            placeholder={`Reste: ${remaining}`}
            aria-label={`Quantité à recevoir pour ${line.product?.name ?? 'ce produit'}`}
          />
        );
      },
    },
    {
      id: 'purchase',
      header: "Prix d'achat",
      width: 140,
      align: 'right',
      cell: (line) => (
        <input
          type="number"
          step="0.01"
          min="0"
          value={line.purchasePrice}
          onChange={(e) => handlePriceChange(receiptLines.indexOf(line), 'purchasePrice', parseFloat(e.target.value) || 0)}
          className="w-24 px-2 py-1 text-right border rounded-md"
          aria-label={`Prix d'achat pour ${line.product?.name ?? 'ce produit'}`}
        />
      ),
    },
    {
      id: 'selling',
      header: 'Prix de vente',
      width: 140,
      align: 'right',
      cell: (line) => (
        <input
          type="number"
          step="0.01"
          min="0"
          value={line.sellingPrice}
          onChange={(e) => handlePriceChange(receiptLines.indexOf(line), 'sellingPrice', parseFloat(e.target.value) || 0)}
          className="w-24 px-2 py-1 text-right border rounded-md"
          aria-label={`Prix de vente pour ${line.product?.name ?? 'ce produit'}`}
        />
      ),
    },
    {
      id: 'status',
      header: 'État',
      width: 96,
      sticky: 'right',
      align: 'center',
      cell: (line) => (
        <div className="flex justify-center">
          <div className={`flex justify-center items-center w-10 h-10 rounded-md ${statusStyles(line.status)}`}>
            {line.status === 'RECEPTIONNE' || line.status === 'PARTIELLEMENT_RECEPTIONNE' ? (
              <PackageCheck className="w-6 h-6" aria-label={line.status === 'RECEPTIONNE' ? 'Réceptionné' : 'Partiellement réceptionné'} />
            ) : (
              <PackageX className="w-6 h-6" aria-label={line.status === 'NON_RECEPTIONNE' ? 'Non réceptionné' : 'En attente'} />
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-2">
      <div className="mb-6">
        <button
          onClick={() => navigate('/supplies')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Retour aux approvisionnements
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg flex flex-col h-[calc(100vh-8rem)] h-[calc(100dvh-8rem)]">
        <div className="p-6">
          <h1 className="text-2xl font-bold">
            Réception de la commande du {format(new Date(supply.created_at!), 'dd/MM/yyyy HH:mm', { locale: fr })}
          </h1>
          {supply.description && (
            <p className="mt-2 text-gray-600">{supply.description}</p>
          )}
        </div>

        {/* Vue desktop */}
        <div className="hidden min-h-0 flex-1 flex-col px-6 pb-4 md:flex">
          <DataTable<ReceiptLine>
            rows={receiptLines}
            rowKey={(line) => String(line.id)}
            label="lignes"
            caption="Lignes de la commande à réceptionner"
            searchPlaceholder="Produit, présentation…"
            columns={receiptColumns}
            fill
          />
        </div>

        {/* Vue mobile */}
        <div className="md:hidden flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {receiptLines.map((line, index) => (
              <div key={line.id} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-medium">{line.product?.name}</h3>
                  <span className="text-sm text-gray-600">({line.presentation?.unit})</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantité commandée
                    </label>
                    <div className="w-full px-3 py-2 border rounded-md bg-gray-50">
                      {line.ordered_quantity}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Déjà reçu
                    </label>
                    <div className="w-full px-3 py-2 border rounded-md bg-gray-50">
                      {line.receivedQuantity}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      À recevoir
                    </label>
                    {line.ordered_quantity - line.receivedQuantity === 0 ? (
                      <div className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-500">
                        0
                      </div>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        max={line.ordered_quantity - line.receivedQuantity}
                        value={line.newQuantity}
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder={`Reste: ${line.ordered_quantity - line.receivedQuantity}`}
                        disabled={line.ordered_quantity - line.receivedQuantity === 0}
                      />
                    )}
                  </div>

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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      État
                    </label>
                    <div
                      className={`flex justify-center items-center h-[42px] rounded-md ${
                        line.status === 'RECEPTIONNE'
                          ? 'bg-green-100 text-green-800'
                          : line.status === 'PARTIELLEMENT_RECEPTIONNE'
                          ? 'bg-yellow-100 text-yellow-800'
                          : line.status === 'NON_RECEPTIONNE'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {line.status === 'RECEPTIONNE' && <PackageCheck className="w-6 h-6" />}
                      {line.status === 'PARTIELLEMENT_RECEPTIONNE' && <PackageCheck className="w-6 h-6" />}
                      {line.status === 'NON_RECEPTIONNE' && <PackageX className="w-6 h-6" />}
                      {line.status === 'EN_ATTENTE' && <PackageX className="w-6 h-6" />}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end space-x-3">
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
      
      {/* Loading Spinner */}
      <LoadingSpinner 
        isVisible={updateLineMutation.isPending} 
        message="Mise à jour en cours..."
      />
    </div>
  );
} 