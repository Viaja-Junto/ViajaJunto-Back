import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@shared/http/dto/pagination-query.dto.js';
import { SAMPLE } from '@shared/http/openapi-samples.js';

export class ListTripExpensesQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Trip whose expenses to list.',
    format: 'uuid',
    example: SAMPLE.plannedTrip,
  })
  @IsUUID('4')
  tripId!: string;
}
