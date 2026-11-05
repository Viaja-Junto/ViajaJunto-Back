import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsersService } from '../../users/application/users.service.js';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  let users: { exists: ReturnType<typeof vi.fn> };
  let strategy: JwtStrategy;

  beforeEach(() => {
    users = { exists: vi.fn() };
    strategy = new JwtStrategy(users as unknown as UsersService);
  });

  it('exposes the token subject as the authenticated user', async () => {
    users.exists.mockResolvedValue(true);

    await expect(
      strategy.validate({ sub: 'user-id', email: 'ana@example.com' }),
    ).resolves.toEqual({ id: 'user-id', email: 'ana@example.com' });
    expect(users.exists).toHaveBeenCalledWith('user-id');
  });

  it('refuses the token of an account that no longer exists', async () => {
    users.exists.mockResolvedValue(false);

    await expect(
      strategy.validate({ sub: 'gone', email: 'x@y.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
