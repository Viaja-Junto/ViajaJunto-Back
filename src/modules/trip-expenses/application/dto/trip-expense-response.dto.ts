import { ApiProperty } from '@nestjs/swagger';
import {
  SPOT_CATEGORIES,
  type SpotCategory,
} from '@modules/tourist-spots/domain/tourist-spot.entity.js';
import {
  SPLIT_TYPES,
  type SplitType,
  type TripExpense,
} from '../../domain/trip-expense.entity.js';
import { ExpenseShareDto } from './create-trip-expense.dto.js';

export class TripExpenseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  tripId!: string;

  @ApiProperty({ format: 'uuid', description: 'Who paid.' })
  payerId!: string;

  @ApiProperty({ description: 'In the trip currency.', example: 300 })
  amount!: number;

  @ApiProperty({ example: 'Jantar no Mercado Público' })
  description!: string;

  @ApiProperty({ enum: SPOT_CATEGORIES, nullable: true })
  category!: SpotCategory | null;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  spentOn!: Date | null;

  @ApiProperty({ enum: SPLIT_TYPES })
  splitType!: SplitType;

  @ApiProperty({
    description: 'What each person owes; adds up to `amount`.',
    type: [ExpenseShareDto],
  })
  shares!: ExpenseShareDto[];

  @ApiProperty({ format: 'uuid', description: 'Who recorded it.' })
  createdBy!: string;

  @ApiProperty()
  createdAt!: Date;

  static from(entity: TripExpense): TripExpenseResponseDto {
    return {
      id: entity.id,
      tripId: entity.tripId,
      payerId: entity.payerId,
      amount: entity.amount,
      description: entity.description,
      category: entity.category,
      spentOn: entity.spentOn,
      splitType: entity.splitType,
      shares: entity.shares.map(({ userId, amount }) => ({ userId, amount })),
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
    };
  }
}
