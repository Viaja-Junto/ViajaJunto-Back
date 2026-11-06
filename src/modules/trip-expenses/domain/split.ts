import { InvalidInputError } from '@shared/domain/errors.js';

export interface CentShare {
  userId: string;
  cents: number;
}

export function equalShares(
  amountCents: number,
  participantIds: string[],
): CentShare[] {
  const people = [...new Set(participantIds)];
  if (people.length === 0) {
    throw new InvalidInputError(['An expense must be split with someone']);
  }

  const base = Math.floor(amountCents / people.length);
  const leftover = amountCents - base * people.length;

  return people.map((userId, index) => ({
    userId,
    cents: base + (index < leftover ? 1 : 0),
  }));
}

export function exactShares(
  amountCents: number,
  shares: CentShare[],
): CentShare[] {
  const people = new Set(shares.map((share) => share.userId));
  if (shares.length === 0 || people.size !== shares.length) {
    throw new InvalidInputError([
      'shares must list each person once, at least one',
    ]);
  }

  const total = shares.reduce((sum, share) => sum + share.cents, 0);
  if (total !== amountCents) {
    throw new InvalidInputError([
      `shares add up to ${(total / 100).toFixed(2)} but the expense is ${(amountCents / 100).toFixed(2)}`,
    ]);
  }

  return shares;
}
