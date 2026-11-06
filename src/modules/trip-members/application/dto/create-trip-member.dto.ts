import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';
import { SAMPLE } from '@shared/http/openapi-samples.js';

export class CreateTripMemberDto {
  @ApiProperty({
    description: 'Trip the user is being added to.',
    format: 'uuid',
    example: SAMPLE.plannedTrip,
  })
  @IsUUID('4')
  tripId!: string;

  @ApiProperty({
    description: 'User being invited.',
    format: 'uuid',
    example: SAMPLE.admin,
  })
  @IsUUID('4')
  userId!: string;

  @ApiProperty({
    description:
      'EDITOR can change the itinerary; VIEWER has read-only access.',
    enum: ['EDITOR', 'VIEWER'],
    example: 'EDITOR',
  })
  @IsIn(['EDITOR', 'VIEWER'])
  permission!: 'EDITOR' | 'VIEWER';
}
