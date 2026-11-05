import { Transform } from 'class-transformer';

/** Trims a body field, so "  Paris " and "Paris" are the same name. */
export const Trimmed = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
