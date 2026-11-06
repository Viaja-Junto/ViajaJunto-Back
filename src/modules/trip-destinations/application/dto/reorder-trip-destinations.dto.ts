import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { SAMPLE } from '@shared/http/openapi-samples.js';

export class ReorderTripDestinationsDto {
  @ApiProperty({
    description:
      'Every destination id of the trip, in the new itinerary order. Must be exactly the trip’s destinations, each once.',
    type: [String],
    format: 'uuid',
    example: [SAMPLE.stopGramado, SAMPLE.stopPortoAlegre],
  })
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  destinationIds!: string[];
}
