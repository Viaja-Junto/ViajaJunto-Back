import { Injectable } from '@nestjs/common';
import {
  TripAccessRepository,
  type TripRole,
} from '../domain/trip-access.repository.js';
import { ForbiddenError, NotFoundError } from '@shared/domain/errors.js';

// Outsiders get the same 404 as a missing trip, so trip ids are never revealed.
@Injectable()
export class TripAccessService {
  constructor(private readonly repository: TripAccessRepository) {}

  assertCanRead(tripId: string, userId: string): Promise<TripRole> {
    return this.resolveRole(tripId, userId);
  }

  async assertCanEdit(tripId: string, userId: string): Promise<TripRole> {
    const role = await this.resolveRole(tripId, userId);

    if (role === 'VIEWER') {
      throw new ForbiddenError('Viewers have read-only access to this trip');
    }

    return role;
  }

  async assertIsCreator(tripId: string, userId: string): Promise<TripRole> {
    const role = await this.resolveRole(tripId, userId);

    if (role !== 'CREATOR') {
      throw new ForbiddenError('Only the trip creator can do this');
    }

    return role;
  }

  async tripIdOfDestination(tripDestinationId: string): Promise<string> {
    const tripId =
      await this.repository.findTripIdByDestination(tripDestinationId);

    if (!tripId) {
      throw new NotFoundError(
        `TripDestination with id "${tripDestinationId}" not found`,
      );
    }

    return tripId;
  }

  async tripIdOfActivity(tripActivityId: string): Promise<string> {
    const tripId = await this.repository.findTripIdByActivity(tripActivityId);

    if (!tripId) {
      throw new NotFoundError(
        `TripActivity with id "${tripActivityId}" not found`,
      );
    }

    return tripId;
  }

  private async resolveRole(tripId: string, userId: string): Promise<TripRole> {
    const role = await this.repository.findRole(tripId, userId);

    if (!role) {
      throw new NotFoundError(`Trip with id "${tripId}" not found`);
    }

    return role;
  }
}
