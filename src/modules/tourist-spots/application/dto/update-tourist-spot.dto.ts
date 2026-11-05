import { PartialType } from '@nestjs/swagger';
import { CreateTouristSpotDto } from './create-tourist-spot.dto.js';

/** Every rule of CreateTouristSpotDto, with each field optional. */
export class UpdateTouristSpotDto extends PartialType(CreateTouristSpotDto) {}
