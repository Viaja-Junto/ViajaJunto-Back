// Pure budget arithmetic. No framework and no ORM dependency.
import {
  SPOT_CATEGORIES,
  type SpotCategory,
} from '@modules/tourist-spots/domain/tourist-spot.entity.js';

/** What the summary needs to know about one planned activity. */
export interface PlannedActivity {
  /** The category of the tourist spot the activity takes place at. */
  category: SpotCategory;
  /** Null when no cost was entered for the activity. */
  expectedCost: number | null;
}

export interface CategoryConsumption {
  category: SpotCategory;
  planned: number;
  count: number;
}

export interface BudgetSummary {
  currency: string;
  /** Null when the trip has no budget yet. */
  totalValue: number | null;
  /** Sum of the expected cost of the trip's activities. */
  planned: number;
  /** `totalValue - planned`; negative when over budget, null without a budget. */
  remaining: number | null;
  /** `true` when what is planned exceeds the total budget. */
  overBudget: boolean;
  activityCount: number;
  /** Activities that have no expected cost, so they weigh 0 in `planned`. */
  unpricedActivities: number;
  /** Every category, in a fixed order, even when nothing is planned in it. */
  byCategory: CategoryConsumption[];
}

const toCents = (amount: number): number => Math.round(amount * 100);
const fromCents = (cents: number): number => cents / 100;

/**
 * Totals are summed in integer cents, so adding 0.1 + 0.2 never produces
 * 0.30000000000000004 in an amount shown to the user.
 */
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
