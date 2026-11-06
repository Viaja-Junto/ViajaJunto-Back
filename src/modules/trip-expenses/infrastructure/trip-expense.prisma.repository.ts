import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Page, PageRequest } from '@shared/domain/pagination.js';
import { PrismaService } from '@shared/database/prisma.service.js';
import { toCents } from '../domain/money.js';
import type {
  Participant,
  TripExpense,
} from '../domain/trip-expense.entity.js';
import {
  type TripExpenseChanges,
  type TripExpenseData,
  TripExpenseRepository,
  type TripLedger,
} from '../domain/trip-expense.repository.js';

const WITH_SHARES = {
  shares: {
    select: { userId: true, amount: true },
    orderBy: { userId: 'asc' },
  },
} satisfies Prisma.TripExpenseInclude;

@Injectable()
export class TripExpensePrismaRepository implements TripExpenseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    tripId: string,
  ): Promise<Page<TripExpense>> {
    const where = { tripId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tripExpense.findMany({
        where,
        include: WITH_SHARES,
        orderBy: [
          { spentOn: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
        skip,
        take,
      }),
      this.prisma.tripExpense.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<TripExpense | null> {
    return this.prisma.tripExpense.findUnique({
      where: { id },
      include: WITH_SHARES,
    });
  }

  create({ shares, ...data }: TripExpenseData): Promise<TripExpense> {
    return this.prisma.tripExpense.create({
      data: { ...data, shares: { create: shares } },
      include: WITH_SHARES,
    });
  }

  async update(
    id: string,
    { shares, ...data }: TripExpenseChanges,
  ): Promise<TripExpense> {
    const [, updated] = await this.prisma.$transaction([
      this.prisma.tripExpenseShare.deleteMany({ where: { expenseId: id } }),
      this.prisma.tripExpense.update({
        where: { id },
        data: { ...data, shares: { create: shares } },
        include: WITH_SHARES,
      }),
    ]);

    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.tripExpense.delete({ where: { id } });
  }

  async participants(tripId: string): Promise<Participant[]> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        creator: { select: { id: true, name: true } },
        members: {
          select: { user: { select: { id: true, name: true } } },
          orderBy: { userId: 'asc' },
        },
      },
    });

    return trip
      ? [trip.creator, ...trip.members.map((member) => member.user)]
      : [];
  }

  async findLedger(tripId: string): Promise<TripLedger | null> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        currency: true,
        creator: { select: { id: true, name: true } },
        members: { select: { user: { select: { id: true, name: true } } } },
        expenses: {
          select: {
            payer: { select: { id: true, name: true } },
            amount: true,
            shares: {
              select: {
                amount: true,
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!trip) return null;

    const people = new Map<string, Participant>();
    const meet = (person: Participant) => people.set(person.id, person);
    meet(trip.creator);
    trip.members.forEach(({ user }) => meet(user));
    trip.expenses.forEach((expense) => {
      meet(expense.payer);
      expense.shares.forEach(({ user }) => meet(user));
    });

    return {
      currency: trip.currency,
      people: [...people.values()],
      entries: trip.expenses.map((expense) => ({
        payerId: expense.payer.id,
        amountCents: toCents(expense.amount),
        shares: expense.shares.map((share) => ({
          userId: share.user.id,
          cents: toCents(share.amount),
        })),
      })),
    };
  }
}
