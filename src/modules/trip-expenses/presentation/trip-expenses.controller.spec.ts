import { describe, expect, it, vi } from 'vitest';
import type { TripExpensesService } from '../application/trip-expenses.service.js';
import { ExpenseBalanceController } from './expense-balance.controller.js';
import { TripExpensesController } from './trip-expenses.controller.js';

const user = { id: 'ana', email: 'ana@example.com' };
const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('trip expense controllers', () => {
  const service = {
    findAll: vi.fn().mockReturnValue('page'),
    findOne: vi.fn().mockReturnValue('one'),
    create: vi.fn().mockReturnValue('created'),
    update: vi.fn().mockReturnValue('updated'),
    remove: vi.fn().mockReturnValue(undefined),
    balance: vi.fn().mockReturnValue('balance'),
  };
  const expenses = new TripExpensesController(
    service as unknown as TripExpensesService,
  );
  const balance = new ExpenseBalanceController(
    service as unknown as TripExpensesService,
  );

  it('delegates every route to the service on behalf of the caller', () => {
    const query = { tripId: id };
    const dto = {
      tripId: id,
      payerId: id,
      amount: 10,
      description: 'Táxi',
      splitType: 'EQUAL' as const,
    };

    expect(expenses.findAll(query, user)).toBe('page');
    expect(expenses.findOne(id, user)).toBe('one');
    expect(expenses.create(dto, user)).toBe('created');
    expect(expenses.update(id, { amount: 5 }, user)).toBe('updated');
    expenses.remove(id, user);
    expect(balance.balance(id, user)).toBe('balance');

    expect(service.findAll).toHaveBeenCalledWith(query, user);
    expect(service.create).toHaveBeenCalledWith(dto, user);
    expect(service.update).toHaveBeenCalledWith(id, { amount: 5 }, user);
    expect(service.remove).toHaveBeenCalledWith(id, user);
    expect(service.balance).toHaveBeenCalledWith(id, user);
  });
});
