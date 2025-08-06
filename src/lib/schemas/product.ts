import { z } from 'zod';

const sellingPriceSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Le libellé est requis'),
  price: z.number().positive('Le prix doit être positif'),
  isDefault: z.boolean().default(false),
});

const presentationSchema = z.object({
  id: z.string().optional(),
  unit: z.string().min(1, 'L\'unité est requise'),
  purchasePrice: z.number().positive('Le prix d\'achat doit être positif'),
  sellingPrice: z.number().positive('Le prix de vente doit être positif'), // Keep for backward compatibility
  sellingPrices: z.array(sellingPriceSchema).optional(),
  stock: z.number().int('Le stock doit être un nombre entier').min(0, 'Le stock ne peut pas être négatif'),
  lowStockThreshold: z.number().int().min(1, 'Le seuil minimum doit être au moins 1'),
  sku: z.string().optional(),
});

export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères'),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères'),
  category: z.string().min(1, 'La catégorie est requise'),
  presentations: z.array(presentationSchema).min(1, 'Au moins une présentation est requise'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type SellingPrice = z.infer<typeof sellingPriceSchema>;
export type Presentation = z.infer<typeof presentationSchema>;
export type Product = z.infer<typeof productSchema>;

export const productUpdateSchema = productSchema.partial();
export type ProductUpdate = z.infer<typeof productUpdateSchema>; 