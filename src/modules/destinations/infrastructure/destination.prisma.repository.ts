import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import type { Destination } from '../domain/destination.entity.js';
import {
  CreateDestinationData,
  DestinationFilter,
  DestinationRepository,
  UpdateDestinationData,
} from '../domain/destination.repository.js';
import { buildDestinationWhere } from './destination.filters.js';

@Injectable()
export class DestinationPrismaRepository implements DestinationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    filter: DestinationFilter,
  ): Promise<Page<Destination>> {
    const where = buildDestinationWhere(filter);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.destination.findMany({
        where,
        skip,
        take,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.destination.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<Destination | null> {
    return this.prisma.destination.findUnique({ where: { id } });
  }

  findTopRated(limit: number): Promise<Destination[]> {
    return this.prisma.destination.findMany({
      where: { status: 'APPROVED', reviewCount: { gt: 0 } },
      orderBy: [
        { averageRating: { sort: 'desc', nulls: 'last' } },
        { reviewCount: 'desc' },
        { name: 'asc' },
        { id: 'asc' },
      ],
      take: limit,
    });
  }

  create(data: CreateDestinationData): Promise<Destination> {
    return this.prisma.destination.create({ data });
  }

  update(id: string, data: UpdateDestinationData): Promise<Destination> {
    return this.prisma.destination.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.destination.delete({ where: { id } });
  }
}
