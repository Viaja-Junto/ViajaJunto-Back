import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';
import { InvalidInputError, NotFoundError } from '@shared/domain/errors.js';
import { EventPublisher } from '@shared/events/app-events.js';
import {
  buildPaginationMeta,
  type PaginatedResponseDto,
} from '@shared/http/dto/paginated-response.dto.js';
import { toPageRequest } from '@shared/http/dto/pagination-query.dto.js';
import { TripAccessService } from '@modules/trip-access/application/trip-access.service.js';
import { fromCents, toCents } from '../domain/money.js';
import { balancesOf, settle } from '../domain/settlement.js';
import { type CentShare, equalShares, exactShares } from '../domain/split.js';
import type {
  ExpenseShare,
  Participant,
  SplitType,
  TripExpense,
} from '../domain/trip-expense.entity.js';
import { TripExpenseRepository } from '../domain/trip-expense.repository.js';
import type {
  CreateTripExpenseDto,
  ExpenseShareDto,
} from './dto/create-trip-expense.dto.js';
import type { ExpenseBalanceResponseDto } from './dto/expense-balance-response.dto.js';
import type { ListTripExpensesQueryDto } from './dto/list-trip-expenses-query.dto.js';
import { TripExpenseResponseDto } from './dto/trip-expense-response.dto.js';
import type { UpdateTripExpenseDto } from './dto/update-trip-expense.dto.js';

interface SplitRequest {
  amount: number;
  splitType: SplitType;
  participantIds?: string[];
  shares?: ExpenseShareDto[];
}

@Injectable()
export class TripExpensesService {
  constructor(
    private readonly repository: TripExpenseRepository,
    private readonly access: TripAccessService,
    private readonly events: EventPublisher,
  ) {}

  async findAll(
    query: ListTripExpensesQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<TripExpenseResponseDto>> {
    await this.access.assertCanRead(query.tripId, user.id);
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      query.tripId,
    );

    return {
      data: items.map((item) => TripExpenseResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<TripExpenseResponseDto> {
    const expense = await this.getOrFail(id);
    await this.access.assertCanRead(expense.tripId, user.id);

    return TripExpenseResponseDto.from(expense);
  }

  async create(
    dto: CreateTripExpenseDto,
    user: AuthenticatedUser,
  ): Promise<TripExpenseResponseDto> {
    await this.access.assertCanEdit(dto.tripId, user.id);
    const people = await this.repository.participants(dto.tripId);
    const shares = this.split(dto, people);
    this.assertInTrip([dto.payerId], people);

    const created = await this.repository.create({
      tripId: dto.tripId,
      payerId: dto.payerId,
      amount: dto.amount,
      description: dto.description,
      category: dto.category ?? null,
      spentOn: dto.spentOn ?? null,
      splitType: dto.splitType,
      createdBy: user.id,
      shares,
    });

    this.events.publish({
      kind: 'trip',
      type: 'EXPENSE_ADDED',
      tripId: dto.tripId,
      actorId: user.id,
      subjectId: created.id,
      details: { amount: created.amount, description: created.description },
    });

    return TripExpenseResponseDto.from(created);
  }

  async update(
    id: string,
    dto: UpdateTripExpenseDto,
    user: AuthenticatedUser,
  ): Promise<TripExpenseResponseDto> {
    const current = await this.getOrFail(id);
    await this.access.assertCanEdit(current.tripId, user.id);
    const people = await this.repository.participants(current.tripId);
    const payerId = dto.payerId ?? current.payerId;
    this.assertInTrip([payerId], people);

    const updated = await this.repository.update(id, {
      payerId,
      amount: dto.amount ?? current.amount,
      description: dto.description ?? current.description,
      category: dto.category ?? current.category,
      spentOn: dto.spentOn ?? current.spentOn,
      splitType: dto.splitType ?? current.splitType,
      shares: this.split(this.resplit(current, dto), people),
    });

    return TripExpenseResponseDto.from(updated);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const expense = await this.getOrFail(id);
    await this.access.assertCanEdit(expense.tripId, user.id);
    await this.repository.remove(id);
  }

  async balance(
    tripId: string,
    user: AuthenticatedUser,
  ): Promise<ExpenseBalanceResponseDto> {
    await this.access.assertCanRead(tripId, user.id);
    const ledger = await this.repository.findLedger(tripId);

    if (!ledger) {
      throw new NotFoundError(`Trip with id "${tripId}" not found`);
    }

    const names = new Map(ledger.people.map(({ id, name }) => [id, name]));
    const nameOf = (id: string) => names.get(id) ?? '';
    const balances = balancesOf(ledger.entries);
    const known = new Set(balances.map((balance) => balance.userId));
    const everyone = [
      ...balances,
      ...ledger.people
        .filter(({ id }) => !known.has(id))
        .map(({ id }) => ({ userId: id, paid: 0, owed: 0, net: 0 })),
    ];

    return {
      currency: ledger.currency,
      total: fromCents(
        ledger.entries.reduce((sum, entry) => sum + entry.amountCents, 0),
      ),
      balances: everyone.map((balance) => ({
        userId: balance.userId,
        name: nameOf(balance.userId),
        paid: fromCents(balance.paid),
        owed: fromCents(balance.owed),
        net: fromCents(balance.net),
      })),
      settlements: settle(balances).map((transfer) => ({
        from: transfer.from,
        fromName: nameOf(transfer.from),
        to: transfer.to,
        toName: nameOf(transfer.to),
        amount: fromCents(transfer.cents),
      })),
    };
  }

  private resplit(
    current: TripExpense,
    dto: UpdateTripExpenseDto,
  ): SplitRequest {
    const splitType = dto.splitType ?? current.splitType;
    const amount = dto.amount ?? current.amount;
    const sameSplit = splitType === current.splitType;

    if (splitType === 'EQUAL') {
      return {
        amount,
        splitType,
        participantIds:
          dto.participantIds ??
          (sameSplit ? current.shares.map((share) => share.userId) : undefined),
        shares: dto.shares,
      };
    }

    const keepShares = sameSplit && amount === current.amount;
    return {
      amount,
      splitType,
      participantIds: dto.participantIds,
      shares: dto.shares ?? (keepShares ? current.shares : undefined),
    };
  }

  private split(request: SplitRequest, people: Participant[]): ExpenseShare[] {
    const cents = toCents(request.amount);
    let shares: CentShare[];

    if (request.splitType === 'EQUAL') {
      if (request.shares) {
        throw new InvalidInputError(['shares are only used by an EXACT split']);
      }
      shares = equalShares(
        cents,
        request.participantIds ?? people.map((person) => person.id),
      );
    } else {
      if (request.participantIds) {
        throw new InvalidInputError([
          'participantIds are only used by an EQUAL split',
        ]);
      }
      if (!request.shares) {
        throw new InvalidInputError(['shares are required for an EXACT split']);
      }
      shares = exactShares(
        cents,
        request.shares.map((share) => ({
          userId: share.userId,
          cents: toCents(share.amount),
        })),
      );
    }

    this.assertInTrip(
      shares.map((share) => share.userId),
      people,
    );

    return shares.map((share) => ({
      userId: share.userId,
      amount: fromCents(share.cents),
    }));
  }

  private assertInTrip(userIds: string[], people: Participant[]): void {
    const inTrip = new Set(people.map((person) => person.id));
    const outsiders = userIds.filter((id) => !inTrip.has(id));

    if (outsiders.length > 0) {
      throw new InvalidInputError([
        `Not part of this trip: ${[...new Set(outsiders)].join(', ')}`,
      ]);
    }
  }

  private async getOrFail(id: string): Promise<TripExpense> {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundError(`TripExpense with id "${id}" not found`);
    }

    return found;
  }
}
