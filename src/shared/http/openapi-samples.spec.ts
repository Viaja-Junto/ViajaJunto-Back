import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SAMPLE, SAMPLE_LOGIN } from './openapi-samples.js';

const seed = readFileSync(
  new URL('../../../prisma/seed.mjs', import.meta.url),
  'utf8',
);

describe('Swagger samples', () => {
  it.each(Object.entries(SAMPLE))(
    '%s is seeded with the same id',
    (key, id) => {
      expect(seed).toContain(`${key}: '${id}'`);
    },
  );

  it('signs in with a seeded account', () => {
    expect(seed).toContain(`'${SAMPLE_LOGIN.email}'`);
    expect(seed).toContain(`'${SAMPLE_LOGIN.password}'`);
  });
});
