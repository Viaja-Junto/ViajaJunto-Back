import type { Page, PageRequest } from '@shared/domain/pagination.js';
import type { PlannedActivity } from './budget-summary.js';
import { Budget } from './budget.entity.js';

export interface BudgetSummarySource {
  currency: string;
  totalValue: number | null;
  activities: PlannedActivity[];
}

export type CreateBudgetData = Omit<Budget, 'id' | 'createdAt' | 'currency'>;
export type UpdateBudgetData = Partial<CreateBudgetData>;

export abstract class BudgetRepository {
  abstract findAll(page: PageRequest, userId: string): Promise<Page<Budget>>;
  abstract findById(id: string): Promise<Budget | null>;
  abstract create(data: CreateBudgetData): Promise<Budget>;
  abstract update(id: string, data: UpdateBudgetData): Promise<Budget>;
  abstract findSummarySource(
    tripId: string,
  ): Promise<BudgetSummarySource | null>;
  abstract remove(id: string): Promise<void>;
}
