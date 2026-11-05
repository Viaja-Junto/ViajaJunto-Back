import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { env } from '../config/env.js';
import {
  buildThrottlerOptions,
  rateLimitsFromEnv,
  StrictRateLimit,
} from './throttling.js';

const limits = { ttlMs: 60_000, readLimit: 300, writeLimit: 60 };

const contextFor = (method: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ method }) }),
  }) as unknown as ExecutionContext;

const limitFor = async (method: string) => {
  const options = buildThrottlerOptions(limits);
  const [throttler] = Array.isArray(options) ? options : options.throttlers;

  return typeof throttler.limit === 'function'
    ? throttler.limit(contextFor(method))
    : throttler.limit;
};

describe('buildThrottlerOptions', () => {
  it('uses one window of the configured length', () => {
    const options = buildThrottlerOptions(limits);
    const throttlers = Array.isArray(options) ? options : options.throttlers;

    expect(throttlers).toHaveLength(1);
    expect(throttlers[0]).toMatchObject({ name: 'default', ttl: 60_000 });
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])(
    'gives %s the read budget',
    async (method) => {
      expect(await limitFor(method)).toBe(300);
    },
  );

  it.each(['POST', 'PATCH', 'PUT', 'DELETE'])(
    'gives %s the smaller write budget',
    async (method) => {
      expect(await limitFor(method)).toBe(60);
    },
  );
});

describe('rateLimitsFromEnv', () => {
  it('reads the window in seconds and hands it over in milliseconds', () => {
    expect(rateLimitsFromEnv()).toEqual({
      ttlMs: env.THROTTLE_TTL_SECONDS * 1000,
      readLimit: env.THROTTLE_LIMIT,
      writeLimit: env.THROTTLE_WRITE_LIMIT,
    });
  });
});

describe('StrictRateLimit', () => {
  it('overrides the default throttler with the strict budget', () => {
    class Sample {
      @StrictRateLimit()
      signIn() {
        return null;
      }
    }

    expect(
      Reflect.getMetadata('THROTTLER:LIMITdefault', Sample.prototype.signIn),
    ).toBe(env.THROTTLE_STRICT_LIMIT);
  });
});
