import { z } from 'zod';

export const stockMovementSchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  presentationId: z.string(),
  quantityIn: z.number().int().nullable(),
  quantityOut: z.number().int().nullable(),
  stockBefore: z.number().int(),
  stockAfter: z.number().int(),
  reason: z.enum(['INITIAL', 'ADJUSTMENT', 'SALE', 'RETURN', 'CORRECTION']),
  saleId: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'CANCELLED']).default('ACTIVE'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type StockMovement = z.infer<typeof stockMovementSchema>;

export const stockMovementCreateSchema = stockMovementSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type StockMovementCreate = z.infer<typeof stockMovementCreateSchema>; 