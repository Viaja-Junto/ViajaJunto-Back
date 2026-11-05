import { ApiProperty } from '@nestjs/swagger';
import type { VisitedCountry } from '../../domain/visited-countries.js';

export class VisitedCountryResponseDto implements VisitedCountry {
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Country name as stored on the destination.',
    example: 'Brasil',
  })
  country!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'ISO 3166-1 alpha-2 code, ready for the frontend map; null when the catalog does not know it.',
    example: 'BR',
  })
  countryCode!: string | null;

  @ApiProperty({
    description: 'In how many of the user’s completed trips it appears.',
    example: 2,
  })
  tripCount!: number;
}
