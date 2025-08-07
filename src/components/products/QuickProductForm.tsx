import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useImperativeHandle, forwardRef } from 'react';
import { z } from 'zod';
import SellingPricesForm from './SellingPricesForm';

const quickProductSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  category: z.string().min(1, "La catégorie est requise"),
  description: z.string().optional(),
  presentations: z.array(z.object({
    unit: z.string().min(1, "L'unité est requise"),
    purchasePrice: z.number().default(0),
    sellingPrice: z.number().default(0),
    stock: z.number().default(0),
    lowStockThreshold: z.number().default(5),
    sellingPrices: z.array(z.object({
      label: z.string().min(1, 'Le libellé est requis'),
      price: z.number().positive('Le prix doit être positif'),
      isDefault: z.boolean().default(false),
    })).optional()
  })).min(1, "Au moins une présentation est requise")
});

type QuickProduct = z.infer<typeof quickProductSchema>;

interface QuickProductFormProps {
  id?: string;
  initialData?: Partial<QuickProduct>;
  onSubmit: (data: QuickProduct) => void;
}

export interface QuickProductFormRef {
  submitForm: () => void;
}

const QuickProductForm = forwardRef<QuickProductFormRef, QuickProductFormProps>(({ id = 'product-form', initialData, onSubmit }, ref) => {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuickProduct>({
    resolver: zodResolver(quickProductSchema),
    defaultValues: {
      ...initialData,
      presentations: initialData?.presentations || [{
        unit: '',
        purchasePrice: 0,
        sellingPrice: 0,
        stock: 0,
        lowStockThreshold: 5,
        sellingPrices: [{
          label: 'Prix public',
          price: 0,
          isDefault: true
        }]
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'presentations',
  });

  const onSubmitForm = (data: QuickProduct) => {
    console.log('Form submitted with data:', data);
    onSubmit(data);
  };

  const onError = (errors: any) => {
    console.error('Form validation errors:', errors);
  };

  useImperativeHandle(ref, () => ({
    submitForm: () => {
      console.log('submitForm called');
      handleSubmit(onSubmitForm, onError)();
    }
  }));

  return (
    <form 
      id={id} 
      onSubmit={(e) => {
        e.preventDefault();
        console.log('Form submit event triggered');
        handleSubmit(onSubmitForm, onError)(e);
      }} 
      className="space-y-6"
    >
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
          <label className="block text-sm font-medium text-gray-700">
            Présentations
          </label>
          <button
            type="button"
            onClick={() => append({
              unit: '',
              purchasePrice: 0,
              sellingPrice: 0,
              stock: 0,
              lowStockThreshold: 5,
              sellingPrices: [{
                label: 'Prix public',
                price: 0,
                isDefault: true
              }]
            })}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter une présentation
          </button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <div className="flex items-center justify-between">
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
                placeholder="Unité (ex: 250ml, 1kg, etc.)"
                {...register(`presentations.${index}.unit`)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.presentations?.[index]?.unit && (
                <p className="mt-1 text-sm text-red-600">{errors.presentations[index].unit.message}</p>
              )}
            </div>

            <SellingPricesForm
              presentationIndex={index}
              control={control}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          </div>
        ))}
      </div>
    </form>
  );
});

export default QuickProductForm; 