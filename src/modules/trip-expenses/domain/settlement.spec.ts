import { describe, expect, it } from 'vitest';
import { balancesOf, settle } from './settlement.js';

describe('balancesOf', () => {
  it('adds what each person paid and owes', () => {
    const balances = balancesOf([
      {
        payerId: 'ana',
        amountCents: 30_000,
        shares: [
          { userId: 'ana', cents: 10_000 },
          { userId: 'bruno', cents: 10_000 },
          { userId: 'carla', cents: 10_000 },
        ],
      },
      {
        payerId: 'bruno',
        amountCents: 6_000,
        shares: [
          { userId: 'bruno', cents: 3_000 },
          { userId: 'carla', cents: 3_000 },
        ],
      },
    ]);

    expect(balances).toEqual([
      { userId: 'ana', paid: 30_000, owed: 10_000, net: 20_000 },
      { userId: 'bruno', paid: 6_000, owed: 13_000, net: -7_000 },
      { userId: 'carla', paid: 0, owed: 13_000, net: -13_000 },
    ]);
  });

  it('is empty without expenses', () => {
    expect(balancesOf([])).toEqual([]);
  });
});

describe('settle', () => {
  it('pays every creditor back with the fewest transfers', () => {
    expect(
      settle([
        { userId: 'ana', paid: 0, owed: 0, net: 20_000 },
        { userId: 'bruno', paid: 0, owed: 0, net: -7_000 },
        { userId: 'carla', paid: 0, owed: 0, net: -13_000 },
      ]),
    ).toEqual([
      { from: 'carla', to: 'ana', cents: 13_000 },
      { from: 'bruno', to: 'ana', cents: 7_000 },
    ]);
  });

  it('splits a debt between several creditors', () => {
    expect(
      settle([
        { userId: 'ana', paid: 0, owed: 0, net: 500 },
        { userId: 'bruno', paid: 0, owed: 0, net: 300 },
        { userId: 'carla', paid: 0, owed: 0, net: -800 },
      ]),
    ).toEqual([
      { from: 'carla', to: 'ana', cents: 500 },
      { from: 'carla', to: 'bruno', cents: 300 },
    ]);
  });

  it('needs no transfer when everyone is even', () => {
    expect(settle([{ userId: 'ana', paid: 100, owed: 100, net: 0 }])).toEqual(
      [],
    );
  });
});
