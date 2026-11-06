import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ForbiddenError,
  InvalidInputError,
  NotFoundError,
} from '@shared/domain/errors.js';
import type { EventPublisher } from '@shared/events/app-events.js';
import type { TripAccessService } from '@modules/trip-access/application/trip-access.service.js';
import type { TripExpense } from '../domain/trip-expense.entity.js';
import type { TripExpenseRepository } from '../domain/trip-expense.repository.js';
import type { CreateTripExpenseDto } from './dto/create-trip-expense.dto.js';
import { TripExpensesService } from './trip-expenses.service.js';

const tripId = '22222222-2222-4222-8222-222222222222';
const ana = { id: 'ana', name: 'Ana' };
const bruno = { id: 'bruno', name: 'Bruno' };
const carla = { id: 'carla', name: 'Carla' };
const user = { id: 'ana', email: 'ana@example.com' };

const expense = (overrides: Partial<TripExpense> = {}): TripExpense => ({
  id: 'exp-1',
  tripId,
  payerId: 'ana',
  amount: 300,
  description: 'Jantar',
  category: null,
  spentOn: null,
  splitType: 'EQUAL',
  createdBy: 'ana',
  createdAt: new Date('2026-11-05T14:00:00.000Z'),
  shares: [
    { userId: 'ana', amount: 100 },
    { userId: 'bruno', amount: 100 },
    { userId: 'carla', amount: 100 },
  ],
  ...overrides,
});

const createDto = (
  overrides: Partial<CreateTripExpenseDto> = {},
): CreateTripExpenseDto => ({
  tripId,
  payerId: 'ana',
  amount: 100,
  description: 'Jantar',
  splitType: 'EQUAL',
  ...overrides,
});

describe('TripExpensesService', () => {
  let repository: {
    [K in keyof TripExpenseRepository]: ReturnType<typeof vi.fn>;
  };
  let access: {
    assertCanRead: ReturnType<typeof vi.fn>;
    assertCanEdit: ReturnType<typeof vi.fn>;
  };
  let events: { publish: ReturnType<typeof vi.fn> };
  let service: TripExpensesService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(expense()),
      create: vi.fn((data) => Promise.resolve(expense({ ...data }))),
      update: vi.fn((id, data) => Promise.resolve(expense({ id, ...data }))),
      remove: vi.fn(),
      participants: vi.fn().mockResolvedValue([ana, bruno, carla]),
      findLedger: vi.fn(),
    };
    access = {
      assertCanRead: vi.fn().mockResolvedValue('VIEWER'),
      assertCanEdit: vi.fn().mockResolvedValue('EDITOR'),
    };
    events = { publish: vi.fn() };
    service = new TripExpensesService(
      repository as unknown as TripExpenseRepository,
      access as unknown as TripAccessService,
      events as unknown as EventPublisher,
    );
  });

  describe('reading', () => {
    it('lists the expenses of a trip the caller can see', async () => {
      repository.findAll.mockResolvedValue({ items: [expense()], total: 1 });

      const result = await service.findAll(
        { tripId, page: 1, limit: 20 },
        user,
      );

      expect(access.assertCanRead).toHaveBeenCalledWith(tripId, 'ana');
      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 0, take: 20 },
        tripId,
      );
      expect(result.data[0]).toMatchObject({ id: 'exp-1', amount: 300 });
    });

    it('shows one expense to a member of its trip', async () => {
      await expect(service.findOne('exp-1', user)).resolves.toMatchObject({
        id: 'exp-1',
      });
      expect(access.assertCanRead).toHaveBeenCalledWith(tripId, 'ana');
    });

    it('answers 404 for an expense that does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('nope', user)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('recording', () => {
    it('splits equally between everyone in the trip by default and notifies the others', async () => {
      const result = await service.create(createDto(), user);

      expect(access.assertCanEdit).toHaveBeenCalledWith(tripId, 'ana');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'ana',
          category: null,
          spentOn: null,
          shares: [
            { userId: 'ana', amount: 33.34 },
            { userId: 'bruno', amount: 33.33 },
            { userId: 'carla', amount: 33.33 },
          ],
        }),
      );
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EXPENSE_ADDED',
          tripId,
          actorId: 'ana',
          details: { amount: 100, description: 'Jantar' },
        }),
      );
      expect(result.shares).toHaveLength(3);
    });

    it('splits equally between the chosen people', async () => {
      await service.create(
        createDto({ participantIds: ['bruno', 'carla'] }),
        user,
      );

      expect(repository.create.mock.calls[0][0].shares).toEqual([
        { userId: 'bruno', amount: 50 },
        { userId: 'carla', amount: 50 },
      ]);
    });

    it('keeps exact shares that add up to the amount', async () => {
      await service.create(
        createDto({
          splitType: 'EXACT',
          shares: [
            { userId: 'ana', amount: 70.5 },
            { userId: 'bruno', amount: 29.5 },
          ],
        }),
        user,
      );

      expect(repository.create.mock.calls[0][0].shares).toEqual([
        { userId: 'ana', amount: 70.5 },
        { userId: 'bruno', amount: 29.5 },
      ]);
    });

    it.each([
      ['a payer outside the trip', { payerId: 'stranger' }],
      [
        'someone outside the trip in the split',
        { participantIds: ['ana', 'stranger'] },
      ],
      [
        'shares on an EQUAL split',
        { shares: [{ userId: 'ana', amount: 100 }] },
      ],
      ['an EXACT split without shares', { splitType: 'EXACT' as const }],
      [
        'participantIds on an EXACT split',
        {
          splitType: 'EXACT' as const,
          participantIds: ['ana'],
          shares: [{ userId: 'ana', amount: 100 }],
        },
      ],
      [
        'exact shares that do not add up',
        {
          splitType: 'EXACT' as const,
          shares: [{ userId: 'ana', amount: 90 }],
        },
      ],
    ])('refuses %s with 422', async (_, overrides) => {
      await expect(
        service.create(createDto(overrides), user),
      ).rejects.toBeInstanceOf(InvalidInputError);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('lets only the creator and editors record', async () => {
      access.assertCanEdit.mockRejectedValue(new ForbiddenError('Viewer'));

      await expect(service.create(createDto(), user)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(repository.participants).not.toHaveBeenCalled();
    });
  });

  describe('changing', () => {
    it('keeps the same people when only the amount of an EQUAL split changes', async () => {
      await service.update('exp-1', { amount: 90 }, user);

      expect(access.assertCanEdit).toHaveBeenCalledWith(tripId, 'ana');
      expect(repository.update).toHaveBeenCalledWith(
        'exp-1',
        expect.objectContaining({
          amount: 90,
          payerId: 'ana',
          description: 'Jantar',
          shares: [
            { userId: 'ana', amount: 30 },
            { userId: 'bruno', amount: 30 },
            { userId: 'carla', amount: 30 },
          ],
        }),
      );
    });

    it('keeps exact shares while the amount stays the same', async () => {
      repository.findById.mockResolvedValue(
        expense({
          splitType: 'EXACT',
          shares: [
            { userId: 'ana', amount: 200 },
            { userId: 'bruno', amount: 100 },
          ],
        }),
      );

      await service.update('exp-1', { description: 'Hotel' }, user);

      expect(repository.update.mock.calls[0][1].shares).toEqual([
        { userId: 'ana', amount: 200 },
        { userId: 'bruno', amount: 100 },
      ]);
    });

    it('asks for new shares when the amount of an EXACT split changes', async () => {
      repository.findById.mockResolvedValue(
        expense({
          splitType: 'EXACT',
          shares: [{ userId: 'ana', amount: 300 }],
        }),
      );

      await expect(
        service.update('exp-1', { amount: 50 }, user),
      ).rejects.toThrow('shares are required for an EXACT split');
    });

    it('splits between everyone again when switching to EQUAL without people', async () => {
      repository.findById.mockResolvedValue(
        expense({
          splitType: 'EXACT',
          shares: [{ userId: 'ana', amount: 300 }],
        }),
      );

      await service.update('exp-1', { splitType: 'EQUAL' }, user);

      expect(repository.update.mock.calls[0][1].shares).toHaveLength(3);
    });

    it('refuses a new payer outside the trip', async () => {
      await expect(
        service.update('exp-1', { payerId: 'stranger' }, user),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('deletes for the creator and editors', async () => {
      await service.remove('exp-1', user);

      expect(access.assertCanEdit).toHaveBeenCalledWith(tripId, 'ana');
      expect(repository.remove).toHaveBeenCalledWith('exp-1');
    });
  });

  describe('balance', () => {
    it('says who owes whom, with names, and lists people without expenses', async () => {
      repository.findLedger.mockResolvedValue({
        currency: 'BRL',
        people: [ana, bruno, carla, { id: 'dani', name: 'Dani' }],
        entries: [
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
        ],
      });

      const result = await service.balance(tripId, user);

      expect(access.assertCanRead).toHaveBeenCalledWith(tripId, 'ana');
      expect(result.total).toBe(360);
      expect(result.balances).toContainEqual({
        userId: 'bruno',
        name: 'Bruno',
        paid: 60,
        owed: 130,
        net: -70,
      });
      expect(result.balances).toContainEqual({
        userId: 'dani',
        name: 'Dani',
        paid: 0,
        owed: 0,
        net: 0,
      });
      expect(result.settlements).toEqual([
        {
          from: 'carla',
          fromName: 'Carla',
          to: 'ana',
          toName: 'Ana',
          amount: 130,
        },
        {
          from: 'bruno',
          fromName: 'Bruno',
          to: 'ana',
          toName: 'Ana',
          amount: 70,
        },
      ]);
    });

    it('answers 404 when the trip disappeared', async () => {
      repository.findLedger.mockResolvedValue(null);

      await expect(service.balance(tripId, user)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
});
