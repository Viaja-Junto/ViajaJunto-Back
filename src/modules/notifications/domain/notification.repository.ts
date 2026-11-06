import type { Page, PageRequest } from '@shared/domain/pagination.js';
import type { Notification } from './notification.entity.js';

export type NewNotification = Omit<Notification, 'id' | 'readAt' | 'createdAt'>;

export abstract class NotificationRepository {
  abstract createMany(notifications: NewNotification[]): Promise<void>;
  abstract findAll(
    page: PageRequest,
    userId: string,
  ): Promise<Page<Notification>>;
  abstract countUnread(userId: string): Promise<number>;
  abstract markRead(id: string, userId: string): Promise<Notification | null>;
  abstract markAllRead(userId: string): Promise<number>;
  abstract findUserName(userId: string): Promise<string | null>;
  abstract findTripAudience(
    tripId: string,
  ): Promise<{ name: string; people: string[] } | null>;
}
