import { Injectable, NotFoundException } from '@nestjs/common';
import type { AppEvent } from '../../../shared/events/app-events.js';
import {
  buildPaginationMeta,
  type PaginatedResponseDto,
} from '../../../shared/http/dto/paginated-response.dto.js';
import {
  toPageRequest,
  type PaginationQueryDto,
} from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { notificationsFor } from '../domain/notification-plan.js';
import { NotificationRepository } from '../domain/notification.repository.js';
import {
  MarkedReadResponseDto,
  NotificationResponseDto,
  UnreadCountResponseDto,
} from './dto/notification-response.dto.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationRepository) {}

  async notify(event: AppEvent): Promise<void> {
    const notifications = notificationsFor(event, {
      actorName: await this.repository.findUserName(event.actorId),
    });

    if (notifications.length > 0) {
      await this.repository.createMany(notifications);
    }
  }

  async findAll(
    query: PaginationQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<NotificationResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      user.id,
    );

    return {
      data: items.map((item) => NotificationResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async unreadCount(user: AuthenticatedUser): Promise<UnreadCountResponseDto> {
    return { unread: await this.repository.countUnread(user.id) };
  }

  /** Someone else's notification answers 404, so others cannot tell it exists. */
  async markRead(
    id: string,
    user: AuthenticatedUser,
  ): Promise<NotificationResponseDto> {
    const notification = await this.repository.markRead(id, user.id);

    if (!notification) {
      throw new NotFoundException(`Notification with id "${id}" not found`);
    }

    return NotificationResponseDto.from(notification);
  }

  async markAllRead(user: AuthenticatedUser): Promise<MarkedReadResponseDto> {
    return { updated: await this.repository.markAllRead(user.id) };
  }
}
