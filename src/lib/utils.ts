import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Russian pluralization helper
 * @param count - number to pluralize for
 * @param one - nominative singular (1 предложение)
 * @param few - genitive singular (2-4 предложения)
 * @param many - genitive plural (5+ предложений, also 11-14)
 * @returns appropriate form based on count
 */
export function pluralize(count: number, one: string, few: string, many: string): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  // 11-14 are special (use many form)
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return many;
  }

  if (lastDigit === 1) {
    return one;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return few;
  }

  return many;
}
