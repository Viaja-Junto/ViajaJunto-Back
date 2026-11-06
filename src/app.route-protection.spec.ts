import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { RequestMethod } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AuthController } from '@modules/auth/presentation/auth.controller.js';
import { JwtAuthGuard } from '@modules/auth/presentation/guards/jwt-auth.guard.js';
import { BudgetSummaryController } from '@modules/budgets/presentation/budget-summary.controller.js';
import { BudgetsController } from '@modules/budgets/presentation/budgets.controller.js';
import { DestinationReviewsController } from '@modules/destination-reviews/presentation/destination-reviews.controller.js';
import { DestinationsController } from '@modules/destinations/presentation/destinations.controller.js';
import { TripActivitiesController } from '@modules/trip-activities/presentation/trip-activities.controller.js';
import { TripDestinationsController } from '@modules/trip-destinations/presentation/trip-destinations.controller.js';
import { TripItineraryController } from '@modules/trip-destinations/presentation/trip-itinerary.controller.js';
import { TripMembersController } from '@modules/trip-members/presentation/trip-members.controller.js';
import { TripInviteController } from '@modules/trips/presentation/trip-invite.controller.js';
import { TripsController } from '@modules/trips/presentation/trips.controller.js';
import { NotificationsController } from '@modules/notifications/presentation/notifications.controller.js';
import { ReviewsController } from '@modules/reviews/presentation/reviews.controller.js';
import { TouristSpotsController } from '@modules/tourist-spots/presentation/tourist-spots.controller.js';
import { UsersController } from '@modules/users/presentation/users.controller.js';

type Controller = new (...args: never[]) => object;

const controllers: Controller[] = [
  AuthController,
  TouristSpotsController,
  ReviewsController,
  UsersController,
  NotificationsController,
  DestinationsController,
  TripsController,
  TripInviteController,
  TripMembersController,
  TripDestinationsController,
  TripItineraryController,
  TripActivitiesController,
  BudgetsController,
  BudgetSummaryController,
  DestinationReviewsController,
];

const PUBLIC = new Set([
  'AuthController.register',
  'AuthController.login',
  'AuthController.googleSignIn',
  'AuthController.googleCallback',
  'TouristSpotsController.findAll',
  'TouristSpotsController.findTop',
  'TouristSpotsController.findOne',
  'DestinationsController.findAll',
  'DestinationsController.findTop',
  'DestinationsController.findOne',
  'DestinationsController.findDetails',
  'TouristSpotsController.findDetails',
  'DestinationReviewsController.findAll',
  'DestinationReviewsController.findOne',
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
