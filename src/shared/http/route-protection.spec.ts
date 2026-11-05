import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { RequestMethod } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AuthController } from '../../modules/auth/presentation/auth.controller.js';
import { JwtAuthGuard } from '../../modules/auth/presentation/guards/jwt-auth.guard.js';
import { ReviewsController } from '../../modules/reviews/presentation/reviews.controller.js';
import { TouristSpotsController } from '../../modules/tourist-spots/presentation/tourist-spots.controller.js';

type Controller = new (...args: never[]) => object;

const controllers: Controller[] = [
  AuthController,
  TouristSpotsController,
  ReviewsController,
];

/** Routes open to visitors; every other route must require a token. */
const PUBLIC = new Set([
  'AuthController.register',
  'AuthController.login',
  'TouristSpotsController.findAll',
  'TouristSpotsController.findTop',
  'TouristSpotsController.findOne',
  'ReviewsController.findAll',
  'ReviewsController.findOne',
]);

function routes(controller: Controller) {
  const proto = controller.prototype as Record<string, unknown>;

  return Object.getOwnPropertyNames(proto)
    .filter((name) => name !== 'constructor')
    .filter((name) => Reflect.hasMetadata(PATH_METADATA, proto[name] as object))
    .map((name) => {
      const handler = proto[name] as object;
      const guards: unknown[] = [
        ...(Reflect.getMetadata(GUARDS_METADATA, controller) ?? []),
        ...(Reflect.getMetadata(GUARDS_METADATA, handler) ?? []),
      ];

      return {
        id: `${controller.name}.${name}`,
        method: RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler)],
        guards,
      };
    });
}

describe('route protection', () => {
  const all = controllers.flatMap(routes);

  it('discovers the routes of every controller', () => {
    expect(all.map((route) => route.id)).toEqual(
      expect.arrayContaining([...PUBLIC]),
    );
  });

  it.each(all.filter((route) => !PUBLIC.has(route.id)))(
    '$method $id requires a valid access token',
    ({ guards }) => {
      expect(guards).toContain(JwtAuthGuard);
    },
  );

  it.each(all.filter((route) => PUBLIC.has(route.id)))(
    '$id is public',
    ({ guards }) => {
      expect(guards).not.toContain(JwtAuthGuard);
    },
  );
});
