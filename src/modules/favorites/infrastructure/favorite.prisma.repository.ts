import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '@shared/domain/pagination.js';
import { PrismaService } from '@shared/database/prisma.service.js';
import type { Destination } from '@modules/destinations/domain/destination.entity.js';
import type { TouristSpot } from '@modules/tourist-spots/domain/tourist-spot.entity.js';
import {
  type FavoriteIds,
  type FavoriteKind,
  FavoriteRepository,
} from '../domain/favorite.repository.js';

@Injectable()
export class FavoritePrismaRepository implements FavoriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, kind: FavoriteKind, id: string): Promise<void> {
    if (kind === 'destination') {
      await this.prisma.favoriteDestination.upsert({
        where: { userId_destinationId: { userId, destinationId: id } },
        create: { userId, destinationId: id },
        update: {},
      });
      return;
    }

    await this.prisma.favoriteTouristSpot.upsert({
      where: { userId_touristSpotId: { userId, touristSpotId: id } },
      create: { userId, touristSpotId: id },
      update: {},
    });
  }

  async remove(userId: string, kind: FavoriteKind, id: string): Promise<void> {
    if (kind === 'destination') {
      await this.prisma.favoriteDestination.deleteMany({
        where: { userId, destinationId: id },
      });
      return;
    }

    await this.prisma.favoriteTouristSpot.deleteMany({
      where: { userId, touristSpotId: id },
    });
  }

  async ids(userId: string): Promise<FavoriteIds> {
    const [destinations, spots] = await this.prisma.$transaction([
      this.prisma.favoriteDestination.findMany({
        where: { userId, destination: { status: 'APPROVED' } },
        select: { destinationId: true },
      }),
      this.prisma.favoriteTouristSpot.findMany({
        where: { userId, touristSpot: { status: 'APPROVED' } },
        select: { touristSpotId: true },
      }),
    ]);

    return {
      destinationIds: destinations.map((row) => row.destinationId),
      touristSpotIds: spots.map((row) => row.touristSpotId),
    };
  }

  async listDestinations(
    userId: string,
    { skip, take }: PageRequest,
  ): Promise<Page<Destination>> {
    const where = { userId, destination: { status: 'APPROVED' as const } };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.favoriteDestination.findMany({
        where,
        include: { destination: true },
        orderBy: [{ createdAt: 'desc' }, { destinationId: 'asc' }],
        skip,
        take,
      }),
      this.prisma.favoriteDestination.count({ where }),
    ]);

    return { items: rows.map((row) => row.destination), total };
  }

  async listTouristSpots(
    userId: string,
    { skip, take }: PageRequest,
  ): Promise<Page<TouristSpot>> {
    const where = { userId, touristSpot: { status: 'APPROVED' as const } };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.favoriteTouristSpot.findMany({
        where,
        include: { touristSpot: true },
        orderBy: [{ createdAt: 'desc' }, { touristSpotId: 'asc' }],
        skip,
        take,
      }),
      this.prisma.favoriteTouristSpot.count({ where }),
    ]);

    return { items: rows.map((row) => row.touristSpot), total };
  }
}
