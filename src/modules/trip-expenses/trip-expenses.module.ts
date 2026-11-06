import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module.js';
import { TripAccessModule } from '@modules/trip-access/trip-access.module.js';
import { TripExpensesService } from './application/trip-expenses.service.js';
import { TripExpenseRepository } from './domain/trip-expense.repository.js';
import { TripExpensePrismaRepository } from './infrastructure/trip-expense.prisma.repository.js';
import { ExpenseBalanceController } from './presentation/expense-balance.controller.js';
import { TripExpensesController } from './presentation/trip-expenses.controller.js';

@Module({
  imports: [AuthModule, TripAccessModule],
  controllers: [TripExpensesController, ExpenseBalanceController],
  providers: [
    TripExpensesService,
    { provide: TripExpenseRepository, useClass: TripExpensePrismaRepository },
  ],
})
export class TripExpensesModule {}
