import { randomUUID } from 'node:crypto';
import { ScryptPasswordHasher } from './../../src/modules/auth/infrastructure/scrypt-password.hasher.js';
import type { PrismaService } from './../../src/shared/database/prisma.service.js';

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
  async user(): Promise<Account> {
    this.passwordHash ??= new ScryptPasswordHasher().hash(TEST_PASSWORD);
    const name = this.next('user');
    const user = await this.prisma.user.create({
      data: {
        name,
        email: `${name}@example.com`,
        passwordHash: await this.passwordHash,
      },
    });
    this.track(user.id);

    return { id: user.id, email: user.email, name: user.name };
  }

  /** Deletes everything this suite created. Safe to call twice. */
  async dispose(): Promise<void> {
    await this.prisma.user.deleteMany({ where: { id: { in: this.users } } });
    this.users.length = 0;
  }
}
