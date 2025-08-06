import { useFieldArray, useForm } from 'react-hook-form';
import { Plus, Trash2, Star } from 'lucide-react';
import { SellingPrice } from '../../lib/schemas/product';

interface SellingPricesFormProps {
  presentationIndex: number;
  control: any;
  register: any;
  watch: any;
  setValue: any;
}

export default function SellingPricesForm({ 
  presentationIndex, 
  control, 
  register, 
  watch, 
  setValue 
}: SellingPricesFormProps) {
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: `presentations.${presentationIndex}.sellingPrices`,
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const handleAddPrice = () => {
    append({
      label: '',
      price: 0,
      isDefault: false
    });
  };

  const handleSetDefault = (index: number) => {
    // Set all prices to not default
    fields.forEach((_, i) => {
      setValue(`presentations.${presentationIndex}.sellingPrices.${i}.isDefault`, false);
    });
    // Set the selected price as default
    setValue(`presentations.${presentationIndex}.sellingPrices.${index}.isDefault`, true);
  };

  const watchedPrices = watch(`presentations.${presentationIndex}.sellingPrices`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-gray-700">Prix de vente</h5>
        <button
          type="button"
          onClick={handleAddPrice}
          className="flex items-center text-xs text-blue-600 hover:text-blue-700"
        >
          <Plus className="h-3 w-3 mr-1" />
          Ajouter un prix
        </button>
      </div>

      {fields.map((field, priceIndex) => (
        <div key={field.id} className="border rounded-lg p-3 space-y-3">
          <div className="flex justify-between items-center">
            <h6 className="text-xs font-medium text-gray-600">Prix {priceIndex + 1}</h6>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleSetDefault(priceIndex)}
                className={`p-1 rounded ${
                  watchedPrices?.[priceIndex]?.isDefault 
                    ? 'text-yellow-500' 
                    : 'text-gray-400 hover:text-yellow-500'
                }`}
                title="Définir comme prix par défaut"
              >
                <Star className="h-3 w-3" />
              </button>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(priceIndex)}
                  className="text-red-600 hover:text-red-700"
                  title="Supprimer ce prix"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600">Libellé</label>
              <input
                type="text"
                {...register(`presentations.${presentationIndex}.sellingPrices.${priceIndex}.label`)}
                placeholder="ex: Prix public, Prix grossiste..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">Prix</label>
              <input
                type="number"
                step="0.01"
                {...register(`presentations.${presentationIndex}.sellingPrices.${priceIndex}.price`, { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {watchedPrices?.[priceIndex]?.price > 0 && (
            <div className="text-xs text-gray-500">
              {formatPrice(watchedPrices[priceIndex].price)}
              {watchedPrices[priceIndex].isDefault && (
                <span className="ml-2 text-yellow-600 font-medium">(Prix par défaut)</span>
              )}
            </div>
          )}
        </div>
      ))}

      {fields.length === 0 && (
        <div className="text-center py-4 text-sm text-gray-500">
          Aucun prix de vente défini
        </div>
      )}
    </div>
  );
} 