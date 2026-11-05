import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/viajajunto',
};

describe('validateEnv', () => {
  it('applies the documented defaults', () => {
    const env = validateEnv(valid);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.API_PREFIX).toBe('api');
    expect(env.SWAGGER_PATH).toBe('docs');
    expect(env.TRUST_PROXY_HOPS).toBe(0);
  });

  it('coerces PORT from the string the environment always gives', () => {
    expect(validateEnv({ ...valid, PORT: '8080' }).PORT).toBe(8080);
  });

  it('rejects a port outside the valid range', () => {
    expect(() => validateEnv({ ...valid, PORT: '70000' })).toThrow(
      /Invalid environment variables/,
    );
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a DATABASE_URL that is not PostgreSQL', () => {
    expect(() =>
      validateEnv({ ...valid, DATABASE_URL: 'mysql://root@localhost:3306/db' }),
    ).toThrow(/PostgreSQL connection string/);
  });

  it('accepts the postgres:// scheme as well', () => {
    expect(
      validateEnv({
        ...valid,
        DATABASE_URL: 'postgres://u:p@localhost:5432/db',
      }).DATABASE_URL,
    ).toContain('postgres://');
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(
      /Invalid environment variables/,
    );
  });

  it('lists every problem at once', () => {
    try {
      validateEnv({ NODE_ENV: 'staging', PORT: 'abc' });
      expect.unreachable('should have thrown');
    } catch (error) {
      const message = (error as Error).message;

      expect(message).toContain('NODE_ENV');
      expect(message).toContain('PORT');
      expect(message).toContain('DATABASE_URL');
    }
  });

  describe('rate limiting', () => {
    it('applies the documented defaults', () => {
      const env = validateEnv(valid);

      expect(env.THROTTLE_TTL_SECONDS).toBe(60);
      expect(env.THROTTLE_LIMIT).toBe(300);
      expect(env.THROTTLE_WRITE_LIMIT).toBe(60);
      expect(env.THROTTLE_STRICT_LIMIT).toBe(10);
    });

    it('rejects a limit that is not a positive integer', () => {
      expect(() => validateEnv({ ...valid, THROTTLE_LIMIT: '0' })).toThrow(
        /THROTTLE_LIMIT/,
      );
    });
  });

  describe('CORS_ORIGINS', () => {
    it('defaults to the local frontend', () => {
      expect(validateEnv(valid).CORS_ORIGINS).toEqual([
        'http://localhost:5173',
      ]);
    });

    it('splits a comma-separated list and trims the entries', () => {
      const env = validateEnv({
        ...valid,
        CORS_ORIGINS: 'http://localhost:5173, https://app.example.com ,',
      });

      expect(env.CORS_ORIGINS).toEqual([
        'http://localhost:5173',
        'https://app.example.com',
      ]);
    });

    it.each([
      'https://app.example.com/',
      'https://app.example.com/path',
      '*',
      'app.example.com',
    ])('rejects %s, which is not a bare origin', (origin) => {
      expect(() => validateEnv({ ...valid, CORS_ORIGINS: origin })).toThrow(
        /CORS_ORIGINS/,
      );
    });
  });
});
