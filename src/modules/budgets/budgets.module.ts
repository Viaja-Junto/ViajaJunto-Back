import { TripAccessModule } from '@modules/trip-access/trip-access.module.js';
import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module.js';
import { BudgetsService } from './application/budgets.service.js';
import { BudgetRepository } from './domain/budget.repository.js';
import { BudgetPrismaRepository } from './infrastructure/budget.prisma.repository.js';
import { BudgetSummaryController } from './presentation/budget-summary.controller.js';
import { BudgetsController } from './presentation/budgets.controller.js';

@Module({
  imports: [AuthModule, TripAccessModule],
  controllers: [BudgetsController, BudgetSummaryController],
  providers: [
    BudgetsService,
    { provide: BudgetRepository, useClass: BudgetPrismaRepository },
  ],
  exports: [BudgetsService],
})
export class BudgetsModule {}
