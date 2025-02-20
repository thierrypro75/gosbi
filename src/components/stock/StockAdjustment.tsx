import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { stockMovementService } from '../../lib/services/stockMovementService';
import { productService } from '../../lib/services/productService';
import { Product, Presentation } from '../../lib/schemas/product';
import { Plus, Minus } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface StockAdjustmentProps {
  product: Product;
  presentation: Presentation;
  onClose?: () => void;
}

export default function StockAdjustment({ product, presentation, onClose }: StockAdjustmentProps) {
  const [quantity, setQuantity] = useState<number>(0);
  const [isAddition, setIsAddition] = useState<boolean>(true);
  const queryClient = useQueryClient();

  const { mutate: adjustStock, isLoading } = useMutation({
    mutationFn: async () => {
      const adjustedQuantity = isAddition ? quantity : -quantity;
      const newStock = presentation.stock + adjustedQuantity;

      if (newStock < 0) {
        throw new Error('Le stock ne peut pas être négatif');
      }

      // Créer le mouvement de stock
      await stockMovementService.create({
        productId: product.id,
        presentationId: presentation.id,
        quantityIn: isAddition ? quantity : null,
        quantityOut: !isAddition ? quantity : null,
        stockBefore: presentation.stock,
        stockAfter: newStock,
        reason: 'ADJUSTMENT'
      });

      // Mettre à jour le stock dans la présentation
      await productService.updateStock(presentation.id, adjustedQuantity);

      return newStock;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      toast.success('Stock ajusté avec succès');
      if (onClose) onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'ajustement du stock');
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Ajuster le stock - {presentation.unit}
        </h3>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setIsAddition(true)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
              isAddition
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            <Plus className="inline-block h-4 w-4 mr-1" />
            Entrée
          </button>
          <button
            onClick={() => setIsAddition(false)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
              !isAddition
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            <Minus className="inline-block h-4 w-4 mr-1" />
            Sortie
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Quantité
          </label>
          <input
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => adjustStock()}
            disabled={isLoading || quantity === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'En cours...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  );
} 