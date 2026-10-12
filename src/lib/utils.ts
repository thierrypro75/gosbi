import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

/** Montant raccourci (ex. 132,3 M MGA) à partir d'un million ; en dessous, montant complet. */
export function formatPriceCompact(price: number): string {
  const abs = Math.abs(price);
  if (abs < 1_000_000) return formatPrice(price);
  const [divisor, suffix] = abs >= 1_000_000_000 ? [1_000_000_000, 'Md'] : [1_000_000, 'M'];
  const value = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(price / divisor);
  return `${value} ${suffix} MGA`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
  }).format(new Date(date));
}