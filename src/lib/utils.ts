import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function ageFromBirthYear(birthYear: number | null | undefined, today = new Date()): number | null {
  return birthYear ? today.getFullYear() - birthYear : null;
}

export function downloadFile(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
