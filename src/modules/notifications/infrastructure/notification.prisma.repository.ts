import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Page, PageRequest } from '@shared/domain/pagination.js';
import { PrismaService } from '@shared/database/prisma.service.js';
import type {
  Notification,
  NotificationPayload,
} from '../domain/notification.entity.js';
import {
  NewNotification,
  NotificationRepository,
} from '../domain/notification.repository.js';

type Row = Prisma.NotificationGetPayload<object>;

const toEntity = (row: Row): Notification => ({
  ...row,
  payload: row.payload as NotificationPayload,
});

@Injectable()
export class NotificationPrismaRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(notifications: NewNotification[]): Promise<void> {
    await this.prisma.notification.createMany({
      data: notifications.map(({ payload, ...rest }) => ({
        ...rest,
        payload: payload as Prisma.InputJsonObject,
      })),
    });
  }

  async findAll(
    { skip, take }: PageRequest,
    userId: string,
  ): Promise<Page<Notification>> {
    // Prisma cannot order by "is read", so the page of ids is picked in SQL and
    // the rows are then loaded in that order.
    const [ids, total] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM notification
        WHERE user_id = ${userId}
        ORDER BY (read_at IS NOT NULL), created_at DESC, id
        LIMIT ${take} OFFSET ${skip}`,
      this.prisma.notification.count({ where: { userId } }),
    ]);

    const rows = await this.prisma.notification.findMany({
      where: { id: { in: ids.map(({ id }) => id) } },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));

    return {
      items: ids.flatMap(({ id }) => {
        const row = byId.get(id);
        return row ? [toEntity(row)] : [];
      }),
      total,
    };
  }

  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(id: string, userId: string): Promise<Notification | null> {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!existing) return null;
    if (existing.readAt) return toEntity(existing);

    return toEntity(
      await this.prisma.notification.update({
        where: { id },
        data: { readAt: new Date() },
      }),
    );
  }

  async markAllRead(userId: string): Promise<number> {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return count;
  }

  async findTripAudience(
    tripId: string,
  ): Promise<{ name: string; people: string[] } | null> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        name: true,
        createdBy: true,
        members: { select: { userId: true } },
      },
    });

    return trip
      ? {
          name: trip.name,
          people: [trip.createdBy, ...trip.members.map(({ userId }) => userId)],
        }
      : null;
  }

  async findUserName(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    return user?.name ?? null;
  }
}
