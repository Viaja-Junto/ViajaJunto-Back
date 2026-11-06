import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';
import { SAMPLE } from '@shared/http/openapi-samples.js';

export class CreateBudgetDto {
  @ApiProperty({
    description: 'Trip this budget belongs to. One budget per trip.',
    format: 'uuid',
    example: SAMPLE.completedTrip,
  })
  @IsUUID('4')
  tripId!: string;

  @ApiProperty({
    description:
      'Total amount available for the trip, in the currency of the trip.',
    minimum: 0,
    example: 8500,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalValue!: number;
}
