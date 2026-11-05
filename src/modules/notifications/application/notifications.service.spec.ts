import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppEvent } from '@shared/events/app-events.js';
import type { Notification } from '../domain/notification.entity.js';
import type { NotificationRepository } from '../domain/notification.repository.js';
import { NotificationsService } from './notifications.service.js';

const user = { id: 'ana', email: 'ana@example.com' };

const notification: Notification = {
  id: 'n1',
  userId: 'ana',
  tripId: null,
  actorId: 'admin',
  type: 'SUBMISSION_APPROVED',
  payload: { subjectName: 'Usina' },
  readAt: null,
  createdAt: new Date('2026-11-05T14:00:00.000Z'),
};

const event: AppEvent = {
  kind: 'submission',
  type: 'SUBMISSION_REJECTED',
  actorId: 'admin',
  authorId: 'ana',
  catalog: 'DESTINATION',
  subjectId: 'd1',
  subjectName: 'Gramado',
  reason: 'Já existe',
};

describe('NotificationsService', () => {
  let repository: Record<
    keyof NotificationRepository,
    ReturnType<typeof vi.fn>
  >;
  let service: NotificationsService;

  beforeEach(() => {
    repository = {
      createMany: vi.fn(),
      findAll: vi.fn().mockResolvedValue({ items: [notification], total: 1 }),
      countUnread: vi.fn().mockResolvedValue(4),
      markRead: vi.fn(),
      markAllRead: vi.fn().mockResolvedValue(2),
      findUserName: vi.fn().mockResolvedValue('Administrador'),
      findTripAudience: vi.fn().mockResolvedValue({
        name: 'Eurotrip',
        people: ['ana', 'bia', 'caio'],
      }),
    };
    service = new NotificationsService(
      repository as unknown as NotificationRepository,
    );
  });

  describe('notify', () => {
    it('stores the notification of the author, with the actor name', async () => {
      await service.notify(event);

      expect(repository.findUserName).toHaveBeenCalledWith('admin');
      expect(repository.createMany).toHaveBeenCalledWith([
        expect.objectContaining({
          userId: 'ana',
          type: 'SUBMISSION_REJECTED',
          payload: expect.objectContaining({
            actorName: 'Administrador',
            reason: 'Já existe',
          }),
        }),
      ]);
    });

    it('stores nothing when there is nobody to tell', async () => {
      await service.notify({ ...event, authorId: 'admin' });

      expect(repository.createMany).not.toHaveBeenCalled();
    });
  });

  it('lists the caller’s notifications in the { data, meta } envelope', async () => {
    const result = await service.findAll({ page: 1, limit: 20 }, user);

    expect(repository.findAll).toHaveBeenCalledWith(
      { skip: 0, take: 20 },
      'ana',
    );
    expect(result.data).toEqual([
      expect.objectContaining({ id: 'n1', read: false }),
    ]);
    expect(result.meta.total).toBe(1);
  });

  it('counts the unread notifications', async () => {
    await expect(service.unreadCount(user)).resolves.toEqual({ unread: 4 });
  });

  describe('markRead', () => {
    it('returns the notification marked as read', async () => {
      repository.markRead.mockResolvedValue({
        ...notification,
        readAt: new Date(),
      });

      await expect(service.markRead('n1', user)).resolves.toMatchObject({
        read: true,
      });
      expect(repository.markRead).toHaveBeenCalledWith('n1', 'ana');
    });

    it('answers 404 for a notification that is not the caller’s', async () => {
      repository.markRead.mockResolvedValue(null);

      await expect(service.markRead('n1', user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  it('marks every notification as read', async () => {
    await expect(service.markAllRead(user)).resolves.toEqual({ updated: 2 });
  });

  describe('notify (trip events)', () => {
    const tripEvent: AppEvent = {
      kind: 'trip',
      type: 'DESTINATION_ADDED',
      tripId: 't1',
      actorId: 'ana',
      subjectId: 'stop',
    };

    it('tells everyone on the trip except who did it', async () => {
      await service.notify(tripEvent);

      expect(repository.findTripAudience).toHaveBeenCalledWith('t1');
      expect(repository.createMany).toHaveBeenCalledWith([
        expect.objectContaining({
          userId: 'bia',
          tripId: 't1',
          payload: expect.objectContaining({
            tripName: 'Eurotrip',
            subjectId: 'stop',
          }),
        }),
        expect.objectContaining({ userId: 'caio', tripId: 't1' }),
      ]);
    });

    it('tells nobody about a trip that no longer exists', async () => {
      repository.findTripAudience.mockResolvedValue(null);

      await service.notify(tripEvent);

      expect(repository.createMany).not.toHaveBeenCalled();
    });
  });
});
