import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '@shared/http/dto/pagination-query.dto.js';
import { TrimmedText } from '@shared/http/dto/search-text.js';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Text to look for in the name or the email (case-insensitive), e.g. to find someone to invite to a trip.',
    example: 'ana',
    maxLength: 100,
  })
  @TrimmedText()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
