import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@shared/http/dto/pagination-query.dto.js';

export class ListTripExpensesQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Trip whose expenses to list.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @IsUUID('4')
  tripId!: string;
}
