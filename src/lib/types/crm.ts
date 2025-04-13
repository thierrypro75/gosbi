export type ClientType = 'VETERINAIRE' | 'PETSHOP' | 'CLIENT_FINAL';
export type InteractionType = 'APPEL' | 'EMAIL' | 'VISITE' | 'REUNION';
export type TaskPriority = 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE';
export type TaskStatus = 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: ClientType;
  address?: string;
  city?: string;
  postalCode?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Interaction {
  id: string;
  clientId: string;
  type: InteractionType;
  date: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientWithRelations extends Client {
  interactions: Interaction[];
  tasks: Task[];
  sales: {
    id: string;
    saleId: string;
    date: Date;
    totalAmount: number;
  }[];
} 