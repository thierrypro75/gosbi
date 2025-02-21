import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Product, Presentation } from '../../lib/schemas/product';

const saleSchema = z.object({
  presentationId: z.string().min(1, "La présentation est requise"),
  quantity: z.number().min(1, "La quantité doit être supérieure à 0"),
});

type SaleFormData = z.infer<typeof saleSchema>;

interface SaleFormProps {
  id?: string;
  products: Product[];
  onSubmit: (data: SaleFormData) => void;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

export default function SaleForm({ id = 'sale-form', products, onSubmit }: SaleFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      quantity: 1,
    },
  });

  const selectedPresentationId = watch('presentationId');
  const selectedPresentation = products
    .flatMap(p => p.presentations)
    .find(p => p.id === selectedPresentationId);

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
                  {presentation.unit} - {formatPrice(presentation.sellingPrice)} 
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

      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
          Quantité
        </label>
        <input
          type="number"
          id="quantity"
          min="1"
          max={selectedPresentation?.stock || 1}
          {...register('quantity', { valueAsNumber: true })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        {errors.quantity && (
          <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
        )}
      </div>

      {selectedPresentation && (
        <div className="rounded-md bg-gray-50 p-4">
          <div className="text-sm text-gray-700">
            <p>Prix unitaire : {formatPrice(selectedPresentation.sellingPrice)}</p>
            <p className="font-medium mt-2">
              Total : {formatPrice(selectedPresentation.sellingPrice * (watch('quantity') || 0))}
            </p>
          </div>
        </div>
      )}
    </form>
  );
} 