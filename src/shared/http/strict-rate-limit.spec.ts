import { describe, expect, it } from 'vitest';
import { AuthController } from '../../modules/auth/presentation/auth.controller.js';
import { HealthController } from '../../modules/health/presentation/health.controller.js';
import { ReviewsController } from '../../modules/reviews/presentation/reviews.controller.js';
import { TouristSpotsController } from '../../modules/tourist-spots/presentation/tourist-spots.controller.js';
import { env } from '../config/env.js';

type Constructor = new (...args: never[]) => object;

const limitOf = (target: object) =>
  Reflect.getMetadata('THROTTLER:LIMITdefault', target) as number | undefined;
const skipped = (target: object) =>
  Reflect.getMetadata('THROTTLER:SKIPdefault', target) as boolean | undefined;
const handler = (controller: Constructor, name: string) =>
  (controller.prototype as Record<string, object>)[name];

describe('strict rate limits', () => {
  it.each([
    [AuthController, 'register'],
    [AuthController, 'login'],
    [ReviewsController, 'create'],
  ] as const)('%o.%s allows only the strict budget', (controller, name) => {
    expect(limitOf(handler(controller, name))).toBe(env.THROTTLE_STRICT_LIMIT);
  });

  it('leaves ordinary routes on the default budget', () => {
    expect(limitOf(handler(AuthController, 'me'))).toBeUndefined();
    expect(limitOf(handler(ReviewsController, 'findAll'))).toBeUndefined();
    expect(limitOf(handler(TouristSpotsController, 'create'))).toBeUndefined();
  });

  it('never throttles the health check, which probes call every few seconds', () => {
    expect(skipped(HealthController)).toBe(true);
  });
});
