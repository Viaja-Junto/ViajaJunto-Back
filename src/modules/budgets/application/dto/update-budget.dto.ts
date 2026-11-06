import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateBudgetDto } from './create-budget.dto.js';

export class UpdateBudgetDto extends PartialType(
  OmitType(CreateBudgetDto, ['tripId'] as const),
) {}
