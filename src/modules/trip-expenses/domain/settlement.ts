import type { CentShare } from './split.js';

export interface LedgerEntry {
  payerId: string;
  amountCents: number;
  shares: CentShare[];
}

export interface Balance {
  userId: string;
  paid: number;
  owed: number;
  net: number;
}

export interface Transfer {
  from: string;
  to: string;
  cents: number;
}

export function balancesOf(entries: LedgerEntry[]): Balance[] {
  const byUser = new Map<string, Balance>();
  const of = (userId: string) => {
    let balance = byUser.get(userId);
    if (!balance) {
      balance = { userId, paid: 0, owed: 0, net: 0 };
      byUser.set(userId, balance);
    }
    return balance;
  };

  for (const entry of entries) {
    of(entry.payerId).paid += entry.amountCents;
    for (const share of entry.shares) {
      of(share.userId).owed += share.cents;
    }
  }

  return [...byUser.values()].map((balance) => ({
    ...balance,
    net: balance.paid - balance.owed,
  }));
}

export function settle(balances: Balance[]): Transfer[] {
  const debtors = balances
    .filter((balance) => balance.net < 0)
    .map((balance) => ({ userId: balance.userId, left: -balance.net }));
  const creditors = balances
    .filter((balance) => balance.net > 0)
    .map((balance) => ({ userId: balance.userId, left: balance.net }));
  const byLargest = (a: { left: number }, b: { left: number }) =>
    b.left - a.left;
  const transfers: Transfer[] = [];

  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort(byLargest);
    creditors.sort(byLargest);
    const debtor = debtors[0];
    const creditor = creditors[0];
    const cents = Math.min(debtor.left, creditor.left);

    transfers.push({ from: debtor.userId, to: creditor.userId, cents });
    debtor.left -= cents;
    creditor.left -= cents;
    if (debtor.left === 0) debtors.shift();
    if (creditor.left === 0) creditors.shift();
  }

  return transfers;
}
