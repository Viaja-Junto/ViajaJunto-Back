import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Page, PageRequest } from '@shared/domain/pagination.js';
import { escapeLike } from '@shared/database/like.js';
import { accessibleTrips } from '@shared/database/trip-scope.js';
import { PrismaService } from '@shared/database/prisma.service.js';
import {
  lockDestinations,
  syncDestinationRatings,
} from '@shared/database/destination-rating.js';
import {
  lockTouristSpots,
  syncSpotRatings,
} from '@shared/database/spot-rating.js';
import type { User, UserCredentials } from '../domain/user.entity.js';
import type { VisitedPlace } from '../domain/visited-countries.js';
import {
  CreateUserData,
  UpdateUserData,
  UserFilter,
  UserRepository,
  UserSession,
} from '../domain/user.repository.js';

const PUBLIC_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    { text }: UserFilter,
  ): Promise<Page<User>> {
    const where: Prisma.UserWhereInput = text
      ? {
          OR: [
            { name: { contains: escapeLike(text), mode: 'insensitive' } },
            { email: { contains: escapeLike(text), mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        select: PUBLIC_FIELDS,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_FIELDS,
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: PUBLIC_FIELDS,
    });
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { googleId },
      select: PUBLIC_FIELDS,
    });
  }

  findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { ...PUBLIC_FIELDS, passwordHash: true },
    });
  }

  findSession(id: string): Promise<UserSession | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { tokensValidAfter: true },
    });
  }

  async findVisitedPlaces(userId: string): Promise<VisitedPlace[]> {
    const stops = await this.prisma.tripDestination.findMany({
      where: {
        trip: { AND: [accessibleTrips(userId), { status: 'COMPLETED' }] },
      },
      select: {
        tripId: true,
        destination: { select: { country: true, countryCode: true } },
      },
    });

    return stops.map(({ tripId, destination }) => ({
      tripId,
      country: destination.country,
      countryCode: destination.countryCode,
    }));
  }

  async revokeTokens(id: string, validAfter: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { tokensValidAfter: validAfter },
    });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data, select: PUBLIC_FIELDS });
  }

  update(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
      select: PUBLIC_FIELDS,
    });
  }

  // Reviews cascade with the user, so the ratings they fed are refreshed in the same transaction.
  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const reviewed = (
        await tx.review.findMany({
          where: { userId: id },
          select: { touristSpotId: true },
        })
      ).map(({ touristSpotId }) => touristSpotId);
      const reviewedDestinations = (
        await tx.destinationReview.findMany({
          where: { userId: id },
          select: { destinationId: true },
        })
      ).map(({ destinationId }) => destinationId);

      await lockTouristSpots(tx, reviewed);
      await lockDestinations(tx, reviewedDestinations);
      await tx.user.delete({ where: { id } });
      await syncSpotRatings(tx, reviewed);
      await syncDestinationRatings(tx, reviewedDestinations);
    });
  }
}
