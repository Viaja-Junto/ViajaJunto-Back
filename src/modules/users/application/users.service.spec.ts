import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../domain/user.entity.js';
import type { UserRepository } from '../domain/user.repository.js';
import { UsersService } from './users.service.js';

const user: User = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ana Souza',
  email: 'ana@example.com',
  createdAt: new Date('2026-03-14T18:22:05.000Z'),
};

describe('UsersService', () => {
  let repository: Record<keyof UserRepository, ReturnType<typeof vi.fn>>;
  let service: UsersService;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findCredentialsByEmail: vi.fn(),
      create: vi.fn(),
    };
    service = new UsersService(repository as unknown as UserRepository);
  });

  describe('exists', () => {
    it('is true for an account that is still there', async () => {
      repository.findById.mockResolvedValue(user);

      await expect(service.exists(user.id)).resolves.toBe(true);
    });

    it('is false once the account is gone', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.exists(user.id)).resolves.toBe(false);
    });
  });

  describe('getProfile', () => {
    it('returns the public fields of the account', async () => {
      repository.findById.mockResolvedValue({
        ...user,
        passwordHash: 'scrypt:secret',
      });

      await expect(service.getProfile(user.id)).resolves.toEqual(user);
    });

    it('throws NotFoundException for an unknown account', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getProfile(user.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
