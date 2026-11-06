import type { Page, PageRequest } from '@shared/domain/pagination.js';
import type { LedgerEntry } from './settlement.js';
import type { Participant, TripExpense } from './trip-expense.entity.js';

export type TripExpenseData = Omit<TripExpense, 'id' | 'createdAt'>;

export type TripExpenseChanges = Omit<TripExpenseData, 'tripId' | 'createdBy'>;

export interface TripLedger {
  currency: string;
  entries: LedgerEntry[];
  people: Participant[];
}

export abstract class TripExpenseRepository {
  abstract findAll(
    page: PageRequest,
    tripId: string,
  ): Promise<Page<TripExpense>>;
  abstract findById(id: string): Promise<TripExpense | null>;
  abstract create(data: TripExpenseData): Promise<TripExpense>;
  abstract update(id: string, data: TripExpenseChanges): Promise<TripExpense>;
  abstract remove(id: string): Promise<void>;
  abstract participants(tripId: string): Promise<Participant[]>;
  abstract findLedger(tripId: string): Promise<TripLedger | null>;
}
