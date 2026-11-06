import { describe, expect, it } from 'vitest';
import { summarizeBudget } from './budget-summary.js';

describe('summarizeBudget', () => {
  it('adds up the planned costs and what is left of the budget', () => {
    const summary = summarizeBudget({
      currency: 'BRL',
      expenses: [],
      totalValue: 1000,
      activities: [
        { category: 'MUSEUM', expectedCost: 120.5 },
        { category: 'PARK', expectedCost: 0 },
        { category: 'MUSEUM', expectedCost: 79.5 },
      ],
    });

    expect(summary).toMatchObject({
      currency: 'BRL',
      totalValue: 1000,
      planned: 200,
      remaining: 800,
      overBudget: false,
      activityCount: 3,
      unpricedActivities: 0,
    });
  });

  it('sums in cents, so 0.1 + 0.2 is exactly 0.3', () => {
    const summary = summarizeBudget({
      currency: 'BRL',
      expenses: [],
      totalValue: null,
      activities: [
        { category: 'OTHER', expectedCost: 0.1 },
        { category: 'OTHER', expectedCost: 0.2 },
      ],
    });

    expect(summary.planned).toBe(0.3);
  });

  it('flags a plan that exceeds the budget, with a negative remainder', () => {
    const summary = summarizeBudget({
      currency: 'EUR',
      totalValue: 100,
      activities: [{ category: 'ENTERTAINMENT', expectedCost: 150 }],
      expenses: [],
    });

    expect(summary).toMatchObject({ remaining: -50, overBudget: true });
  });

  it('counts the activities without a cost apart and leaves them out of the total', () => {
    const summary = summarizeBudget({
      currency: 'BRL',
      expenses: [],
      totalValue: 50,
      activities: [
        { category: 'BEACH', expectedCost: null },
        { category: 'BEACH', expectedCost: 20 },
      ],
    });

    expect(summary).toMatchObject({
      planned: 20,
      unpricedActivities: 1,
      activityCount: 2,
    });
  });

  it('has no remainder and is never over budget without a budget', () => {
    const summary = summarizeBudget({
      currency: 'BRL',
      expenses: [],
      totalValue: null,
      activities: [{ category: 'PARK', expectedCost: 999 }],
    });

    expect(summary).toMatchObject({
      totalValue: null,
      remaining: null,
      overBudget: false,
    });
  });

  it('lists every category in a fixed order, even the empty ones', () => {
    const summary = summarizeBudget({
      currency: 'BRL',
      expenses: [],
      totalValue: null,
      activities: [{ category: 'MUSEUM', expectedCost: 30 }],
    });

    expect(summary.byCategory.map((c) => c.category)).toEqual([
      'NATURE',
      'BEACH',
      'PARK',
      'MUSEUM',
      'MONUMENT',
      'HISTORICAL',
      'ENTERTAINMENT',
      'OTHER',
    ]);
    expect(summary.byCategory.find((c) => c.category === 'MUSEUM')).toEqual({
      category: 'MUSEUM',
      planned: 30,
      spent: 0,
      count: 1,
    });
  });

  it('compares what was actually spent with the budget, per category too', () => {
    const summary = summarizeBudget({
      currency: 'BRL',
      totalValue: 1000,
      activities: [{ category: 'MUSEUM', expectedCost: 100 }],
      expenses: [
        { category: 'MUSEUM', amount: 0.1 },
        { category: 'MUSEUM', amount: 0.2 },
        { category: null, amount: 1100 },
      ],
    });

    expect(summary).toMatchObject({
      planned: 100,
      spent: 1100.3,
      remainingAfterSpent: -100.3,
      overBudget: false,
    });
    expect(summary.byCategory.find((c) => c.category === 'MUSEUM')?.spent).toBe(
      0.3,
    );
    expect(summary.byCategory.find((c) => c.category === 'OTHER')?.spent).toBe(
      1100,
    );
  });

  it('has no remaining after spent without a budget', () => {
    const summary = summarizeBudget({
      currency: 'BRL',
      totalValue: null,
      activities: [],
      expenses: [{ category: 'PARK', amount: 10 }],
    });

    expect(summary.spent).toBe(10);
    expect(summary.remainingAfterSpent).toBeNull();
  });
});
