import { ApiProperty } from '@nestjs/swagger';
import {
  SPOT_CATEGORIES,
  type SpotCategory,
} from '@modules/tourist-spots/domain/tourist-spot.entity.js';
import type {
  BudgetSummary,
  CategoryConsumption,
} from '../../domain/budget-summary.js';

class CategoryConsumptionDto implements CategoryConsumption {
  @ApiProperty({
    description: 'Category of the tourist spots the activities take place at.',
    enum: SPOT_CATEGORIES,
    example: 'MUSEUM',
  })
  category!: SpotCategory;

  @ApiProperty({
    description: 'Expected cost of the activities in this category.',
    example: 320.5,
  })
  planned!: number;

  @ApiProperty({
    description:
      'Recorded expenses in this category (expenses without a category count as OTHER).',
    example: 150,
  })
  spent!: number;

  @ApiProperty({
    description: 'How many planned activities are in this category.',
    example: 4,
  })
  count!: number;
}

export class BudgetSummaryResponseDto implements BudgetSummary {
  @ApiProperty({
    description: 'ISO 4217 currency of every amount, inherited from the trip.',
    example: 'BRL',
  })
  currency!: string;

  @ApiProperty({
    description: 'Total budget; null while the trip has no budget.',
    type: Number,
    nullable: true,
    example: 8500,
  })
  totalValue!: number | null;

  @ApiProperty({
    description:
      'Sum of the expected cost of the trip’s planned activities. Derived, never typed in.',
    example: 1240.75,
  })
  planned!: number;

  @ApiProperty({
    description:
      'Total budget minus what is planned; negative when over budget, null without a budget.',
    type: Number,
    nullable: true,
    example: 7259.25,
  })
  remaining!: number | null;

  @ApiProperty({
    description: 'True when what is planned exceeds the total budget.',
    example: false,
  })
  overBudget!: boolean;

  @ApiProperty({
    description: 'Sum of the expenses actually recorded on the trip.',
    example: 980,
  })
  spent!: number;

  @ApiProperty({
    description:
      'Total budget minus what was actually spent; null without a budget.',
    type: Number,
    nullable: true,
    example: 7520,
  })
  remainingAfterSpent!: number | null;

  @ApiProperty({ description: 'Planned activities in the trip.', example: 9 })
  activityCount!: number;

  @ApiProperty({
    description:
      'Activities without an expected cost; they count as 0 in `planned`.',
    example: 2,
  })
  unpricedActivities!: number;

  @ApiProperty({
    description:
      'Consumption per tourist spot category, always every category in a fixed order.',
    type: [CategoryConsumptionDto],
  })
  byCategory!: CategoryConsumptionDto[];
}
