import {
  SPOT_CATEGORIES,
  type SpotCategory,
} from '@modules/tourist-spots/domain/tourist-spot.entity.js';

export interface PlannedActivity {
  category: SpotCategory;
  expectedCost: number | null;
}

export interface CategoryConsumption {
  category: SpotCategory;
  planned: number;
  count: number;
}

export interface BudgetSummary {
  currency: string;
  totalValue: number | null;
  planned: number;
  remaining: number | null;
  overBudget: boolean;
  activityCount: number;
  unpricedActivities: number;
  byCategory: CategoryConsumption[];
}

const toCents = (amount: number): number => Math.round(amount * 100);
const fromCents = (cents: number): number => cents / 100;

export function summarizeBudget(input: {
  currency: string;
  totalValue: number | null;
  activities: PlannedActivity[];
}): BudgetSummary {
  const centsByCategory = new Map<SpotCategory, number>();
  const countByCategory = new Map<SpotCategory, number>();
  let plannedCents = 0;
  let unpriced = 0;

  for (const { category, expectedCost } of input.activities) {
    countByCategory.set(category, (countByCategory.get(category) ?? 0) + 1);

    if (expectedCost === null) {
      unpriced += 1;
      continue;
    }

    const cents = toCents(expectedCost);
    plannedCents += cents;
    centsByCategory.set(category, (centsByCategory.get(category) ?? 0) + cents);
  }

  const totalCents =
    input.totalValue === null ? null : toCents(input.totalValue);

  return {
    currency: input.currency,
    totalValue: input.totalValue,
    planned: fromCents(plannedCents),
    remaining:
      totalCents === null ? null : fromCents(totalCents - plannedCents),
    overBudget: totalCents !== null && plannedCents > totalCents,
    activityCount: input.activities.length,
    unpricedActivities: unpriced,
    byCategory: SPOT_CATEGORIES.map((category) => ({
      category,
      planned: fromCents(centsByCategory.get(category) ?? 0),
      count: countByCategory.get(category) ?? 0,
    })),
  };
}
