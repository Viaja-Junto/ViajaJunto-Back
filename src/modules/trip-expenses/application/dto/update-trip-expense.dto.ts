import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTripExpenseDto } from './create-trip-expense.dto.js';

export class UpdateTripExpenseDto extends PartialType(
  OmitType(CreateTripExpenseDto, ['tripId'] as const),
) {}
