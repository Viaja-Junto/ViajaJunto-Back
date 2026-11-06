import type { SpotCategory } from '@modules/tourist-spots/domain/tourist-spot.entity.js';

export const SPLIT_TYPES = ['EQUAL', 'EXACT'] as const;

export type SplitType = (typeof SPLIT_TYPES)[number];

export interface ExpenseShare {
  userId: string;
  amount: number;
}

export interface TripExpense {
  id: string;
  tripId: string;
  payerId: string;
  amount: number;
  description: string;
  category: SpotCategory | null;
  spentOn: Date | null;
  splitType: SplitType;
  createdBy: string;
  createdAt: Date;
  shares: ExpenseShare[];
}

export interface Participant {
  id: string;
  name: string;
}
