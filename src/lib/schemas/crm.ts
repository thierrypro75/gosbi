import { z } from 'zod';
import { ClientType, InteractionType, TaskPriority, TaskStatus } from '../types/crm';

export const clientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  type: z.enum(['VETERINAIRE', 'PETSHOP', 'CLIENT_FINAL'] as const),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  assignedTo: z.string().optional(),
  notes: z.string().optional().or(z.literal('')),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const interactionSchema = z.object({
  id: z.string().optional(),
  clientId: z.string(),
  type: z.enum(['APPEL', 'EMAIL', 'VISITE', 'REUNION'] as const),
  date: z.date(),
  notes: z.string().optional().or(z.literal('')),
  createdBy: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const taskSchema = z.object({
  id: z.string().optional(),
  clientId: z.string(),
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères'),
  description: z.string().optional().or(z.literal('')),
  dueDate: z.date().optional(),
  priority: z.enum(['BASSE', 'MOYENNE', 'HAUTE', 'URGENTE'] as const).default('MOYENNE'),
  status: z.enum(['A_FAIRE', 'EN_COURS', 'TERMINEE', 'ANNULEE'] as const).default('A_FAIRE'),
  assignedTo: z.string(),
  createdBy: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Schémas pour la création
export const clientCreateSchema = clientSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const interactionCreateSchema = interactionSchema.omit({ 
  id: true, 
  createdBy: true, 
  createdAt: true, 
  updatedAt: true 
});

export const taskCreateSchema = taskSchema.omit({ 
  id: true, 
  createdBy: true, 
  createdAt: true, 
  updatedAt: true 
});

// Types exportés
export type ClientCreate = z.infer<typeof clientCreateSchema>;
export type InteractionCreate = z.infer<typeof interactionCreateSchema>;
export type TaskCreate = z.infer<typeof taskCreateSchema>; 