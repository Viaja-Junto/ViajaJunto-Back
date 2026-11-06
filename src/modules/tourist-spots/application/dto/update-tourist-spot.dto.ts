import { PartialType } from '@nestjs/swagger';
import { CreateTouristSpotDto } from './create-tourist-spot.dto.js';

export class UpdateTouristSpotDto extends PartialType(CreateTouristSpotDto) {}
