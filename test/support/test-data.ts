import { randomUUID } from 'node:crypto';
import { inviteCode } from './../helpers.js';
import { ScryptPasswordHasher } from './../../src/modules/auth/infrastructure/scrypt-password.hasher.js';
import type { PrismaService } from './../../src/shared/database/prisma.service.js';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED';
type Permission = 'EDITOR' | 'VIEWER';

export interface Account {
  id: string;
  email: string;
  name: string;
}

export const TEST_PASSWORD = 'viaja-junto-test';

/**
 * Builds the rows a suite needs and removes them when it ends.
 *
 * Suites share one database and run in parallel, so they never truncate it:
 * every row is stamped with a per-suite tag and `dispose()` deletes exactly
 * those (children go with their parents through cascades).
 */
export class TestData {
  readonly tag = randomUUID().replace(/-/g, '').slice(0, 8);

  private readonly users: string[] = [];
  private counter = 0;
  private passwordHash?: Promise<string>;

  constructor(private readonly prisma: PrismaService) {}

  /** Unique within the run: `<prefix>-<suite tag>-<n>`. */
  next(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${this.tag}-${this.counter}`;
  }

  /** Remembers a user created through the API, so `dispose()` removes it too. */
  track(userId: string): void {
    this.users.push(userId);
  }

  /** An account whose password is TEST_PASSWORD. */
  async user(role: 'USER' | 'ADMIN' = 'USER'): Promise<Account> {
    this.passwordHash ??= new ScryptPasswordHasher().hash(TEST_PASSWORD);
    const name = this.next('user');
    const user = await this.prisma.user.create({
      data: {
        name,
        email: `${name}@example.com`,
        passwordHash: await this.passwordHash,
        role,
      },
    });
    this.track(user.id);

    return { id: user.id, email: user.email, name: user.name };
  }

  /** A spot created straight in the database by `creator`, published unless said otherwise. */
  touristSpot(
    creator: Account,
    overrides: {
      name?: string;
      city?: string;
      country?: string;
      countryCode?: string;
      category?:
        | 'NATURE'
        | 'BEACH'
        | 'PARK'
        | 'MUSEUM'
        | 'MONUMENT'
        | 'HISTORICAL'
        | 'ENTERTAINMENT'
        | 'OTHER';
      status?: Status;
      destinationId?: string;
      averageRating?: number | null;
      reviewCount?: number;
      createdAt?: Date;
    } = {},
  ) {
    return this.prisma.touristSpot.create({
      data: {
        name: this.next('spot'),
        city: `city-${this.tag}`,
        country: 'Brasil',
        status: 'APPROVED',
        createdBy: creator.id,
        ...overrides,
      },
    });
  }

  /** A destination created straight in the database by `creator`, published unless said otherwise. */
  destination(
    creator: Account,
    overrides: {
      name?: string;
      country?: string;
      countryCode?: string;
      category?: 'CITY' | 'BEACH' | 'NATURE' | 'CULTURAL';
      status?: Status;
      averageRating?: number | null;
      reviewCount?: number;
    } = {},
  ) {
    return this.prisma.destination.create({
      data: {
        name: this.next('destination'),
        country: `country-${this.tag}`,
        status: 'APPROVED',
        createdBy: creator.id,
        ...overrides,
      },
    });
  }

  /** A trip created straight in the database, owned by `owner`. */
  trip(
    owner: Account,
    overrides: {
      name?: string;
      status?: 'PLANNING' | 'CONFIRMED' | 'COMPLETED';
      createdAt?: Date;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    return this.prisma.trip.create({
      data: {
        name: this.next('trip'),
        inviteCode: inviteCode(),
        createdBy: owner.id,
        ...overrides,
      },
    });
  }

  member(tripId: string, user: Account, permission: Permission) {
    return this.prisma.tripMember.create({
      data: { tripId, userId: user.id, permission },
    });
  }

  /**
   * Deletes everything this suite created. Trips block the deletion of their
   * owner and catalog entries outlive their author, so both go first. Safe to
   * call twice.
   */
  async dispose(): Promise<void> {
    const createdBy = { in: this.users };
    await this.prisma.trip.deleteMany({ where: { createdBy } });
    await this.prisma.touristSpot.deleteMany({ where: { createdBy } });
    await this.prisma.destination.deleteMany({ where: { createdBy } });
    await this.prisma.user.deleteMany({ where: { id: { in: this.users } } });
    this.users.length = 0;
  }
}
