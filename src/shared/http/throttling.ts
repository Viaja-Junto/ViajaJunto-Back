import type { ExecutionContext } from '@nestjs/common';
import { Throttle, type ThrottlerModuleOptions } from '@nestjs/throttler';
import { env } from '@shared/config/env.js';

interface RateLimits {
  ttlMs: number;
  readLimit: number;
  writeLimit: number;
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const isRead = (context: ExecutionContext): boolean =>
  READ_METHODS.has(
    context.switchToHttp().getRequest<{ method: string }>().method,
  );

export function buildThrottlerOptions(
  limits: RateLimits,
): ThrottlerModuleOptions {
  return {
    throttlers: [
      {
        name: 'default',
        ttl: limits.ttlMs,
        limit: (context) =>
          isRead(context) ? limits.readLimit : limits.writeLimit,
      },
    ],
  };
}

export const rateLimitsFromEnv = (): RateLimits => ({
  ttlMs: env.THROTTLE_TTL_SECONDS * 1000,
  readLimit: env.THROTTLE_LIMIT,
  writeLimit: env.THROTTLE_WRITE_LIMIT,
});

export const StrictRateLimit = () =>
  Throttle({
    default: {
      ttl: env.THROTTLE_TTL_SECONDS * 1000,
      limit: env.THROTTLE_STRICT_LIMIT,
    },
  });
