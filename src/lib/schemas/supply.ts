import { z } from 'zod';

// Enums
export const SupplyStatus = {
  COMMANDE_INITIEE: 'COMMANDE_INITIEE',
  RECEPTIONNE: 'RECEPTIONNE',
  PARTIELLEMENT_RECEPTIONNE: 'PARTIELLEMENT_RECEPTIONNE',
  NON_RECEPTIONNE: 'NON_RECEPTIONNE'
} as const;

export const SupplyLineStatus = {
  EN_ATTENTE: 'EN_ATTENTE',
  RECEPTIONNE: 'RECEPTIONNE',
  PARTIELLEMENT_RECEPTIONNE: 'PARTIELLEMENT_RECEPTIONNE',
  NON_RECEPTIONNE: 'NON_RECEPTIONNE'
} as const;

// Schémas Zod
export const supplyLineSchema = z.object({
  id: z.string().optional(),
  supplyId: z.string(),
  productId: z.string(),
  presentationId: z.string(),
  orderedQuantity: z.number().int().positive('La quantité commandée doit être supérieure à 0'),
  receivedQuantity: z.number().int().min(0, 'La quantité reçue ne peut pas être négative'),
  purchasePrice: z.number().nullable(),
  sellingPrice: z.number().nullable(),
  status: z.nativeEnum(SupplyLineStatus).default('EN_ATTENTE'),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
  // Relations
  product: z.object({
    name: z.string(),
    category: z.string()
  }).optional(),
  presentation: z.object({
    unit: z.string(),
    purchasePrice: z.number(),
    sellingPrice: z.number()
  }).optional()
});

export const supplySchema = z.object({
  id: z.string().optional(),
  description: z.string().optional(),
  status: z.nativeEnum(SupplyStatus).default('COMMANDE_INITIEE'),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
  lines: z.array(supplyLineSchema).min(1, 'Au moins une ligne est requise')
});

// Types TypeScript
export type SupplyStatus = keyof typeof SupplyStatus;
export type SupplyLineStatus = keyof typeof SupplyLineStatus;
export type Supply = z.infer<typeof supplySchema>;
export type SupplyLine = z.infer<typeof supplyLineSchema>;

// Schémas pour la création et la mise à jour
export const supplyCreateSchema = supplySchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true,
  lines: true 
}).extend({
  lines: z.array(supplyLineSchema.omit({ 
    id: true,
    supplyId: true,
    created_at: true,
    updated_at: true,
    receivedQuantity: true,
    status: true
  }))
});

export const supplyUpdateSchema = supplySchema.partial();
export const supplyLineUpdateSchema = supplyLineSchema.partial();

export type SupplyCreate = z.infer<typeof supplyCreateSchema>;
export type SupplyUpdate = z.infer<typeof supplyUpdateSchema>;
export type SupplyLineUpdate = z.infer<typeof supplyLineUpdateSchema>; 