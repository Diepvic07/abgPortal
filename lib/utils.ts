import { v4 as uuidv4 } from 'uuid';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function generateId(): string {
  return uuidv4();
}

export function formatDate(date: Date = new Date()): string {
  return date.toISOString();
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
