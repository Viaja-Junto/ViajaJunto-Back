export const DEFAULT_CURRENCY = 'BRL';

export function normalizeCurrency(code: string): string {
  return code.trim().toUpperCase();
}
