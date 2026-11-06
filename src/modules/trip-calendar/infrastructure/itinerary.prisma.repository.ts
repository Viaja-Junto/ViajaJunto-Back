import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/database/prisma.service.js';
import { type Itinerary, ItineraryRepository } from '../domain/itinerary.js';

@Injectable()
export class ItineraryPrismaRepository implements ItineraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTrip(tripId: string): Promise<Itinerary | null> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        destinations: {
          orderBy: [{ order: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
          include: {
            destination: { select: { name: true, country: true } },
            activities: {
              orderBy: [
                { dateTime: { sort: 'asc', nulls: 'last' } },
                { id: 'asc' },
              ],
              include: {
                touristSpot: {
                  select: { name: true, address: true, city: true },
                },
              },
            },
          },
        },
      },
    });

    if (!trip) return null;

    return {
      id: trip.id,
      name: trip.name,
      description: trip.description,
      currency: trip.currency,
      startDate: trip.startDate,
      endDate: trip.endDate,
      stops: trip.destinations.map((stop) => ({
        id: stop.id,
        destinationName: stop.destination.name,
        country: stop.destination.country,
        arrival: stop.arrival,
        departure: stop.departure,
        description: stop.description,
        activities: stop.activities.map((activity) => ({
          id: activity.id,
          spotName: activity.touristSpot.name,
          address: activity.touristSpot.address,
          city: activity.touristSpot.city,
          dateTime: activity.dateTime,
          durationMinutes: activity.durationMinutes,
          expectedCost: activity.expectedCost,
          status: activity.status,
        })),
      })),
    };
  }
}
