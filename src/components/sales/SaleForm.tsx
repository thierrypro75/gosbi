import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Product } from '../../lib/schemas/product';

const saleSchema = z.object({
  presentationId: z.string().min(1, "La présentation est requise"),
  sellingPriceId: z.string().min(1, "Le prix de vente est requis"),
  quantity: z.number().min(1, "La quantité doit être supérieure à 0"),
});

type SaleFormData = z.infer<typeof saleSchema>;

interface SaleFormProps {
  id?: string;
  products: Product[];
  onSubmit: (data: SaleFormData) => void;
  onTotalChange?: (total: number) => void;
}



export default function SaleForm({ id = 'sale-form', products, onSubmit, onTotalChange }: SaleFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      quantity: 1,
    },
  });

  const selectedPresentationId = watch('presentationId');
  const selectedSellingPriceId = watch('sellingPriceId');
  const selectedPresentation = products
    .flatMap(p => p.presentations)
    .find(p => p.id === selectedPresentationId);
  const selectedSellingPrice = selectedPresentation?.sellingPrices?.find(sp => sp.id === selectedSellingPriceId);

  // Sélectionner automatiquement le prix par défaut quand une présentation est sélectionnée
  React.useEffect(() => {
    if (selectedPresentation && selectedPresentation.sellingPrices && selectedPresentation.sellingPrices.length > 0) {
      const defaultPrice = selectedPresentation.sellingPrices.find(sp => sp.isDefault);
      if (defaultPrice && defaultPrice.id && !selectedSellingPriceId) {
        setValue('sellingPriceId', defaultPrice.id);
      }
    }
  }, [selectedPresentation, selectedSellingPriceId, setValue]);

  // Calculer et envoyer le total au parent
  React.useEffect(() => {
    if (selectedSellingPrice && onTotalChange) {
      const quantity = watch('quantity') || 0;
      const total = selectedSellingPrice.price * quantity;
      onTotalChange(total);
    }
  }, [selectedSellingPrice, watch('quantity'), onTotalChange]);

  const onSubmitForm = async (data: SaleFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <form id={id} onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      <div>
        <label htmlFor="presentationId" className="block text-sm font-medium text-gray-700">
          Produit
        </label>
        <select
          id="presentationId"
          {...register('presentationId')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Sélectionner un produit</option>
          {products.map((product) => (
            <optgroup key={product.id} label={product.name}>
              {product.presentations.map((presentation) => (
                <option 
                  key={presentation.id} 
                  value={presentation.id}
                  disabled={presentation.stock <= 0}
                >
                  {presentation.unit} - {presentation.sellingPrices?.length || 0} prix disponibles
                  {presentation.stock <= 0 ? ' (Rupture de stock)' : ` (${presentation.stock} en stock)`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {errors.presentationId && (
          <p className="mt-1 text-sm text-red-600">{errors.presentationId.message}</p>
        )}
      </div>

      {selectedPresentation && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Prix de vente
          </label>
          {selectedPresentation.sellingPrices && selectedPresentation.sellingPrices.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {selectedPresentation.sellingPrices.map((sellingPrice) => (
                <button
                  key={sellingPrice.id}
                  type="button"
                  onClick={() => {
                    if (sellingPrice.id) {
                      setValue('sellingPriceId', sellingPrice.id);
                    }
                  }}
                  className={`
                    relative p-4 text-left rounded-lg border-2 transition-all duration-200
                    ${selectedSellingPriceId === sellingPrice.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 small text-center">
                        <span className="text-xs">{sellingPrice.label}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1 text-center text-semibold">
                        <strong>{sellingPrice.price.toLocaleString('fr-FR')}</strong>
                      </div>
                    </div>
                    {selectedSellingPriceId === sellingPrice.id && (
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                Aucun prix de vente défini
            </div>
          )}
          <input
            type="hidden"
            {...register('sellingPriceId')}
          />
          {errors.sellingPriceId && (
            <p className="mt-1 text-sm text-red-600">{errors.sellingPriceId.message}</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
          Quantité
        </label>
        <div className="mt-1 flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              const currentQuantity = watch('quantity') || 1;
              if (currentQuantity > 1) {
                setValue('quantity', currentQuantity - 1);
              }
            }}
            className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <input
            type="number"
            id="quantity"
            min="1"
            max={selectedPresentation?.stock || 1}
            {...register('quantity', { valueAsNumber: true })}
            className="flex-1 text-center text-lg font-semibold rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => {
              const currentQuantity = watch('quantity') || 1;
              const maxStock = selectedPresentation?.stock || 1;
              if (currentQuantity < maxStock) {
                setValue('quantity', currentQuantity + 1);
              }
            }}
            className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        {errors.quantity && (
          <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
        )}
      </div>


    </form>
  );
} 