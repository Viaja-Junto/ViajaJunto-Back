import { PartialType, PickType } from '@nestjs/swagger';
import { CreateTripMemberDto } from './create-trip-member.dto.js';

export class UpdateTripMemberDto extends PartialType(
  PickType(CreateTripMemberDto, ['permission'] as const),
) {}
