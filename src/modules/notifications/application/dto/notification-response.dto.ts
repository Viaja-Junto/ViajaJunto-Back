import { ApiProperty } from '@nestjs/swagger';
import {
  NOTIFICATION_TYPES,
  type Notification,
  type NotificationPayload,
  type NotificationType,
} from '../../domain/notification.entity.js';

export class NotificationResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '5b0c7c1e-2f4a-4e0b-9a55-6d2f1c8e7a10',
  })
  id!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'The trip it happened on; null for the catalogs (moderation).',
    example: null,
  })
  tripId!: string | null;

  @ApiProperty({
    enum: NOTIFICATION_TYPES,
    example: 'SUBMISSION_APPROVED',
    description: 'What happened.',
  })
  type!: NotificationType;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Who did it; null if they deleted their account.',
    example: '11111111-1111-4111-8111-111111111111',
  })
  actorId!: string | null;

  @ApiProperty({
    description:
      'What the client needs to say what happened. Trips: `tripName`, `actorName`, the `subjectId` that changed and, depending on the type, `permission`, `from`/`to` or `action`. Moderation: `catalog` (TOURIST_SPOT or DESTINATION), `subjectId`, `subjectName`, `actorName` and, on a rejection, `reason`.',
    type: 'object',
    additionalProperties: true,
    example: {
      actorName: 'Administrador',
      catalog: 'TOURIST_SPOT',
      subjectId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      subjectName: 'Usina do Gasômetro',
    },
  })
  payload!: NotificationPayload;

  @ApiProperty({ description: 'Whether the user has read it.', example: false })
  read!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  readAt!: Date | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-05T14:00:00.000Z',
  })
  createdAt!: Date;

  static from(entity: Notification): NotificationResponseDto {
    return {
      id: entity.id,
      tripId: entity.tripId,
      type: entity.type,
      actorId: entity.actorId,
      payload: entity.payload,
      read: entity.readAt !== null,
      readAt: entity.readAt,
      createdAt: entity.createdAt,
    };
  }
}

export class UnreadCountResponseDto {
  @ApiProperty({
    description: 'How many notifications are unread.',
    example: 3,
  })
  unread!: number;
}

export class MarkedReadResponseDto {
  @ApiProperty({
    description: 'How many notifications were unread.',
    example: 3,
  })
  updated!: number;
}
