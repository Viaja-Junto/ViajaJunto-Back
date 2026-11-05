import { describe, expect, it } from 'vitest';
import { ScryptPasswordHasher } from './scrypt-password.hasher.js';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('never stores the password itself', async () => {
    const hash = await hasher.hash('viaja-junto-2026');

    expect(hash).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(hash).not.toContain('viaja-junto-2026');
  });

  it('salts every hash, so the same password never hashes the same twice', async () => {
    const [first, second] = await Promise.all([
      hasher.hash('viaja-junto-2026'),
      hasher.hash('viaja-junto-2026'),
    ]);

    expect(first).not.toBe(second);
  });

  it('accepts the right password', async () => {
    const hash = await hasher.hash('viaja-junto-2026');

    await expect(hasher.verify('viaja-junto-2026', hash)).resolves.toBe(true);
  });

  it('refuses a wrong password', async () => {
    const hash = await hasher.hash('viaja-junto-2026');

    await expect(hasher.verify('viaja-junto-2025', hash)).resolves.toBe(false);
  });

  it.each([
    ['an unknown scheme', 'bcrypt:abc:def'],
    ['a missing key', 'scrypt:abcd'],
    ['garbage', 'not-a-hash'],
  ])('refuses a stored value with %s', async (_name, stored) => {
    await expect(hasher.verify('anything', stored)).resolves.toBe(false);
  });
});
