import { ApiProperty } from '@nestjs/swagger';
import {
  CATALOG_STATUSES,
  type CatalogStatus,
  type Moderated,
} from '@shared/domain/moderation.js';

/** The moderation fields every catalog entry answers with. */
export class ModeratedResponseDto {
  @ApiProperty({
    description:
      'PENDING (waiting for an administrator), APPROVED (public) or REJECTED. Public lists only show APPROVED.',
    enum: CATALOG_STATUSES,
    example: 'APPROVED',
  })
  status!: CatalogStatus;

  @ApiProperty({
    type: String,
    description: 'Why an administrator rejected it; null otherwise.',
    example: null,
    nullable: true,
  })
  rejectionReason!: string | null;

  @ApiProperty({
    type: String,
    format: 'uuid',
    description: 'Who suggested it; null once that account is deleted.',
    example: '11111111-1111-4111-8111-111111111111',
    nullable: true,
  })
  createdBy!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'When an administrator approved or rejected it.',
    example: '2026-11-05T15:00:00.000Z',
    nullable: true,
  })
  reviewedAt!: Date | null;

  static fieldsFrom(
    entity: Moderated & { reviewedAt: Date | null },
  ): ModeratedResponseDto {
    return {
      status: entity.status,
      rejectionReason: entity.rejectionReason,
      createdBy: entity.createdBy,
      reviewedAt: entity.reviewedAt,
    };
  }
}
