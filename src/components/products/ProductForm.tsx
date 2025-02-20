import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Product, productSchema } from '../../lib/schemas/product';
import { Plus, Trash2 } from 'lucide-react';

interface ProductFormProps {
  initialData?: Partial<Product>;
  onSubmit: (data: Partial<Product>) => void;
  onCancel: () => void;
  renderFooter?: (isSubmitting: boolean) => React.ReactNode;
}

export default function ProductForm({ initialData, onSubmit, onCancel, renderFooter }: ProductFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Product>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      ...initialData,
      presentations: initialData?.presentations || [{
        unit: '',
        purchasePrice: 0,
        sellingPrice: 0,
        stock: 0,
        lowStockThreshold: 5
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'presentations',
  });

  const onSubmitForm = async (data: Product) => {
    try {
      const formattedData = {
        ...data,
        presentations: data.presentations.map(p => ({
          ...p,
          purchasePrice: Number(p.purchasePrice),
          sellingPrice: Number(p.sellingPrice),
          stock: Number(p.stock),
          lowStockThreshold: Number(p.lowStockThreshold)
        }))
      };
      await onSubmit(formattedData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const onError = (errors: any) => {
    console.error('Form validation failed:', errors);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm, onError)} className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nom du produit
            </label>
            <input
              type="text"
              id="name"
              {...register('name')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              {...register('description')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Catégorie
            </label>
            <input
              type="text"
              id="category"
              {...register('category')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Présentations</h3>
              <button
                type="button"
                onClick={() => append({
                  unit: '',
                  purchasePrice: 0,
                  sellingPrice: 0,
                  stock: 0,
                  lowStockThreshold: 5
                })}
                className="flex items-center text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter une présentation
              </button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-gray-700">Présentation {index + 1}</h4>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Unité</label>
                  <input
                    type="text"
                    {...register(`presentations.${index}.unit`)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {errors.presentations?.[index]?.unit && (
                    <p className="mt-1 text-sm text-red-600">{errors.presentations[index].unit.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prix d'achat</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`presentations.${index}.purchasePrice`, { valueAsNumber: true })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    {errors.presentations?.[index]?.purchasePrice && (
                      <p className="mt-1 text-sm text-red-600">{errors.presentations[index].purchasePrice.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prix de vente</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`presentations.${index}.sellingPrice`, { valueAsNumber: true })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    {errors.presentations?.[index]?.sellingPrice && (
                      <p className="mt-1 text-sm text-red-600">{errors.presentations[index].sellingPrice.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Stock</label>
                    <input
                      type="number"
                      {...register(`presentations.${index}.stock`, { valueAsNumber: true })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    {errors.presentations?.[index]?.stock && (
                      <p className="mt-1 text-sm text-red-600">{errors.presentations[index].stock.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Seuil d'alerte</label>
                    <input
                      type="number"
                      {...register(`presentations.${index}.lowStockThreshold`, { valueAsNumber: true })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    {errors.presentations?.[index]?.lowStockThreshold && (
                      <p className="mt-1 text-sm text-red-600">{errors.presentations[index].lowStockThreshold.message}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {renderFooter && (
        <div className="flex-shrink-0">
          {renderFooter(isSubmitting)}
        </div>
      )}
    </form>
  );
} 