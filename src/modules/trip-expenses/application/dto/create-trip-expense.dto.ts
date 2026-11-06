import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Trimmed } from '@shared/http/dto/transforms.js';
import {
  SPOT_CATEGORIES,
  type SpotCategory,
} from '@modules/tourist-spots/domain/tourist-spot.entity.js';
import {
  SPLIT_TYPES,
  type SplitType,
} from '../../domain/trip-expense.entity.js';

const MAX_PEOPLE = 50;
const MAX_AMOUNT = 1_000_000_000;

export class ExpenseShareDto {
  @ApiProperty({
    description: 'Who owes this part.',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID('4')
  userId!: string;

  @ApiProperty({
    description: 'What they owe, in the trip currency. May be 0.',
    minimum: 0,
    example: 120.5,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  amount!: number;
}

export class CreateTripExpenseDto {
  @ApiProperty({
    description: 'Trip the expense belongs to.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @IsUUID('4')
  tripId!: string;

  @ApiProperty({
    description: 'Who paid: the trip creator or a member.',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID('4')
  payerId!: string;

  @ApiProperty({
    description: 'What was paid, in the trip currency.',
    exclusiveMinimum: true,
    minimum: 0,
    example: 300,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_AMOUNT)
  amount!: number;

  @ApiProperty({
    description: 'What it was for.',
    example: 'Jantar no Mercado Público',
    minLength: 1,
    maxLength: 200,
  })
  @Trimmed()
  @IsString()
  @Length(1, 200)
  description!: string;

  @ApiPropertyOptional({
    description: 'Category, to compare with the budget per category.',
    enum: SPOT_CATEGORIES,
    example: 'OTHER',
  })
  @IsOptional()
  @IsIn(SPOT_CATEGORIES)
  category?: SpotCategory;

  @ApiPropertyOptional({
    description: 'Day of the expense.',
    type: String,
    format: 'date',
    example: '2026-12-02',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  spentOn?: Date;

  @ApiProperty({
    description:
      '`EQUAL`: divided equally between `participantIds` (everyone in the trip when omitted); leftover cents go to the first people. `EXACT`: each person owes the amount in `shares`, which must add up to `amount`.',
    enum: SPLIT_TYPES,
    example: 'EQUAL',
  })
  @IsIn(SPLIT_TYPES)
  splitType!: SplitType;

  @ApiPropertyOptional({
    description: '`EQUAL` only: who shares the expense.',
    type: [String],
    format: 'uuid',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_PEOPLE)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  participantIds?: string[];

  @ApiPropertyOptional({
    description: '`EXACT` only: what each person owes.',
    type: [ExpenseShareDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_PEOPLE)
  @ArrayUnique((share: ExpenseShareDto) => share.userId)
  @ValidateNested({ each: true })
  @Type(() => ExpenseShareDto)
  shares?: ExpenseShareDto[];
}
