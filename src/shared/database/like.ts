// Prisma compiles insensitive `contains`/`equals` to ILIKE without escaping `%` and `_`.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
