import { z } from 'zod';

const presentationSchema = z.object({
  id: z.string(),
  size: z.string().min(1, 'La taille est requise'),
  unit: z.string().min(1, 'L\'unité est requise'),
  purchasePrice: z.number().positive('Le prix d\'achat doit être positif'),
  sellingPrice: z.number().positive('Le prix de vente doit être positif'),
  stock: z.number().int('Le stock doit être un nombre entier').min(0, 'Le stock ne peut pas être négatif'),
  lowStockThreshold: z.number().int().min(1, 'Le seuil minimum doit être au moins 1'),
  sku: z.string().regex(/^[A-Z0-9-]+$/, 'SKU invalide. Utilisez des majuscules, chiffres et tirets'),
});

export const productSchema = z.object({
  id: z.string(),
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères'),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères'),
  category: z.string().min(1, 'La catégorie est requise'),
  presentations: z.array(presentationSchema).min(1, 'Au moins une présentation est requise'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Presentation = z.infer<typeof presentationSchema>;
export type Product = z.infer<typeof productSchema>;

export const productUpdateSchema = productSchema.partial();
export type ProductUpdate = z.infer<typeof productUpdateSchema>; 