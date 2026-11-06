import { ApiProperty } from '@nestjs/swagger';

class PersonBalanceDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Ana Souza' })
  name!: string;

  @ApiProperty({ description: 'What they paid.', example: 300 })
  paid!: number;

  @ApiProperty({ description: 'Their part of the expenses.', example: 100 })
  owed!: number;

  @ApiProperty({
    description: 'paid - owed: positive is owed to them, negative they owe.',
    example: 200,
  })
  net!: number;
}

class SettlementDto {
  @ApiProperty({ format: 'uuid', description: 'Who pays.' })
  from!: string;

  @ApiProperty({ example: 'Bruno' })
  fromName!: string;

  @ApiProperty({ format: 'uuid', description: 'Who receives.' })
  to!: string;

  @ApiProperty({ example: 'Ana Souza' })
  toName!: string;

  @ApiProperty({ example: 70 })
  amount!: number;
}

export class ExpenseBalanceResponseDto {
  @ApiProperty({
    description: 'ISO 4217 currency of the trip.',
    example: 'BRL',
  })
  currency!: string;

  @ApiProperty({ description: 'Sum of every expense.', example: 360 })
  total!: number;

  @ApiProperty({
    description: 'Everyone in the trip or in an expense.',
    type: [PersonBalanceDto],
  })
  balances!: PersonBalanceDto[];

  @ApiProperty({
    description: 'Fewest transfers that leave everyone even.',
    type: [SettlementDto],
  })
  settlements!: SettlementDto[];
}
