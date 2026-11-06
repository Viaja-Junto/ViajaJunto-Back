import { describe, expect, it } from 'vitest';
import { isGoogleConfigured, validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/viajajunto',
  JWT_SECRET: 'a-test-secret-that-is-at-least-32-chars',
};

describe('validateEnv', () => {
  it('applies the documented defaults', () => {
    const env = validateEnv(valid);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.API_PREFIX).toBe('api');
    expect(env.SWAGGER_PATH).toBe('docs');
    expect(env.SWAGGER_UI_PATH).toBe('swagger');
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

  describe('JWT', () => {
    it('defaults the token lifetime to one hour', () => {
      expect(validateEnv(valid).JWT_EXPIRES_IN).toBe(3600);
    });

    it('coerces JWT_EXPIRES_IN to a number of seconds', () => {
      expect(
        validateEnv({ ...valid, JWT_EXPIRES_IN: '900' }).JWT_EXPIRES_IN,
      ).toBe(900);
    });

    it('rejects a missing JWT_SECRET', () => {
      const { JWT_SECRET: _omitted, ...rest } = valid;

      expect(() => validateEnv(rest)).toThrow(/JWT_SECRET/);
    });

    it('rejects a JWT_SECRET too short to resist brute force', () => {
      expect(() => validateEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(
        /at least 32 characters/,
      );
    });
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

  describe('object storage', () => {
    it('leaves S3 disabled when no bucket is configured', () => {
      const env = validateEnv(valid);

      expect(env.S3_BUCKET).toBeUndefined();
      expect(env.AWS_REGION).toBe('us-east-1');
      expect(env.S3_FORCE_PATH_STYLE).toBe(false);
    });

    it('treats blank values from .env as absent', () => {
      const env = validateEnv({
        ...valid,
        S3_BUCKET: '',
        S3_ENDPOINT: '',
        S3_PUBLIC_URL: '',
        S3_FORCE_PATH_STYLE: '',
      });

      expect(env.S3_BUCKET).toBeUndefined();
      expect(env.S3_ENDPOINT).toBeUndefined();
      expect(env.S3_PUBLIC_URL).toBeUndefined();
      expect(env.S3_FORCE_PATH_STYLE).toBe(false);
    });

    it('parses an emulator configuration', () => {
      const env = validateEnv({
        ...valid,
        S3_BUCKET: 'photos',
        S3_ENDPOINT: 'http://ministack:4566',
        S3_PUBLIC_URL: 'http://localhost:4566/photos',
        S3_FORCE_PATH_STYLE: 'true',
      });

      expect(env.S3_BUCKET).toBe('photos');
      expect(env.S3_FORCE_PATH_STYLE).toBe(true);
    });

    it('rejects a malformed public URL', () => {
      expect(() =>
        validateEnv({ ...valid, S3_PUBLIC_URL: 'not a url' }),
      ).toThrow(/S3_PUBLIC_URL/);
    });
  });

  describe('Google sign-in', () => {
    it('is optional and has the documented defaults', () => {
      const env = validateEnv(valid);

      expect(isGoogleConfigured(env)).toBe(false);
      expect(env.GOOGLE_CALLBACK_URL).toBe(
        'http://localhost:3000/api/auth/google/callback',
      );
      expect(env.AUTH_REDIRECT_URL).toBe('http://localhost:5173/auth/callback');
    });

    it('is configured once both the client id and the secret are set', () => {
      expect(
        isGoogleConfigured(
          validateEnv({
            ...valid,
            GOOGLE_CLIENT_ID: 'id',
            GOOGLE_CLIENT_SECRET: 'secret',
          }),
        ),
      ).toBe(true);
      expect(
        isGoogleConfigured(validateEnv({ ...valid, GOOGLE_CLIENT_ID: 'id' })),
      ).toBe(false);
    });

    it('rejects a redirect URL that is not a URL', () => {
      expect(() =>
        validateEnv({ ...valid, AUTH_REDIRECT_URL: 'nope' }),
      ).toThrow(/AUTH_REDIRECT_URL/);
    });
  });
});
