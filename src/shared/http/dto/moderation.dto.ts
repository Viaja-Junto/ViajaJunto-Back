import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import {
  CATALOG_STATUSES,
  type CatalogStatus,
} from '../../domain/moderation.js';
import { PaginationQueryDto } from './pagination-query.dto.js';
import { Trimmed } from './trimmed-string.js';

/** Query string of the administrators' review queue. */
export class ModerationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Which entries to list; the queue to review by default.',
    enum: CATALOG_STATUSES,
    default: 'PENDING',
    example: 'PENDING',
  })
  @IsOptional()
  @IsIn(CATALOG_STATUSES)
  status?: CatalogStatus = 'PENDING';
}

/** Query string of the caller's own suggestions. */
export class MySubmissionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Only the suggestions in this state.',
    enum: CATALOG_STATUSES,
    example: 'REJECTED',
  })
  @IsOptional()
  @IsIn(CATALOG_STATUSES)
  status?: CatalogStatus;
}

export class RejectSubmissionDto {
  @ApiProperty({
    description: 'Why it is rejected; the author is told.',
    example: 'Já existe um ponto com esse nome nesta cidade.',
    minLength: 3,
    maxLength: 500,
  })
  @Trimmed()
  @IsString()
  @Length(3, 500)
  reason!: string;
}
