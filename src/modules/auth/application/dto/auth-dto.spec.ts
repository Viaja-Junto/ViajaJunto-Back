import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { LoginDto } from './login.dto.js';
import { RegisterDto } from './register.dto.js';

const errorsOf = async <T extends object>(
  type: new () => T,
  body: Record<string, unknown>,
) =>
  (await validate(plainToInstance(type, body))).map(({ property }) => property);

const register = {
  name: 'Ana Souza',
  email: 'ana@example.com',
  password: 'viaja-junto-2026',
};

describe('RegisterDto', () => {
  it('accepts a complete payload', async () => {
    expect(await errorsOf(RegisterDto, register)).toEqual([]);
  });

  it('normalises the email to lower case without spaces', () => {
    const dto = plainToInstance(RegisterDto, {
      ...register,
      email: '  Ana@Example.COM ',
    });

    expect(dto.email).toBe('ana@example.com');
  });

  it('trims the name', () => {
    expect(
      plainToInstance(RegisterDto, { ...register, name: '  Ana  ' }).name,
    ).toBe('Ana');
  });

  it.each([
    ['a one-letter name', { name: 'A' }, 'name'],
    ['a blank name', { name: '   ' }, 'name'],
    ['an invalid email', { email: 'not-an-email' }, 'email'],
    ['a short password', { password: 'short' }, 'password'],
    ['a password over 72 characters', { password: 'x'.repeat(73) }, 'password'],
  ])('rejects %s', async (_name, overrides, property) => {
    expect(await errorsOf(RegisterDto, { ...register, ...overrides })).toEqual([
      property,
    ]);
  });
});

describe('LoginDto', () => {
  it('normalises the email like the registration does', () => {
    const dto = plainToInstance(LoginDto, {
      email: 'ANA@example.com',
      password: 'x',
    });

    expect(dto.email).toBe('ana@example.com');
  });

  it('requires a password', async () => {
    expect(
      await errorsOf(LoginDto, { email: 'ana@example.com', password: '' }),
    ).toEqual(['password']);
  });
});
