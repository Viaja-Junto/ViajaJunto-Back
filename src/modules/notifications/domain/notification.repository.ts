import type { Page, PageRequest } from '@shared/domain/pagination.js';
import type { Notification } from './notification.entity.js';

export type NewNotification = Omit<Notification, 'id' | 'readAt' | 'createdAt'>;

export abstract class NotificationRepository {
  abstract createMany(notifications: NewNotification[]): Promise<void>;
  /** The user's notifications: unread first, then newest first. */
  abstract findAll(
    page: PageRequest,
    userId: string,
  ): Promise<Page<Notification>>;
  abstract countUnread(userId: string): Promise<number>;
  /** Null when it is not the user's or does not exist. */
  abstract markRead(id: string, userId: string): Promise<Notification | null>;
  /** How many were unread. */
  abstract markAllRead(userId: string): Promise<number>;
  abstract findUserName(userId: string): Promise<string | null>;
  /** The trip name and its creator and members; null when the trip no longer exists. */
  abstract findTripAudience(
    tripId: string,
  ): Promise<{ name: string; people: string[] } | null>;
}
