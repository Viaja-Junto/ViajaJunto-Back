import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../domain/user.entity.js';
import type { UserRepository } from '../domain/user.repository.js';
import { UsersService } from './users.service.js';

const ana: User = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ana Souza',
  email: 'ana@example.com',
  role: 'USER',
  createdAt: new Date('2026-03-14T18:22:05.000Z'),
};
const caller = { id: ana.id, email: ana.email };
const stranger = {
  id: '99999999-9999-4999-8999-999999999999',
  email: 'eve@example.com',
};

describe('UsersService', () => {
  let repository: Record<keyof UserRepository, ReturnType<typeof vi.fn>>;
  let service: UsersService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn().mockResolvedValue({ items: [ana], total: 1 }),
      findById: vi.fn(),
      findCredentialsByEmail: vi.fn(),
      findSession: vi.fn(),
      findVisitedPlaces: vi.fn(),
      revokeTokens: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    service = new UsersService(repository as unknown as UserRepository);
  });

  afterEach(() => vi.useRealTimers());

  it('pages the users and searches by name or email', async () => {
    const result = await service.findAll({ page: 2, limit: 10, q: 'ana' });

    expect(repository.findAll).toHaveBeenCalledWith(
      { skip: 10, take: 10 },
      { text: 'ana' },
    );
    expect(result.meta).toMatchObject({ page: 2, limit: 10, total: 1 });
  });

  describe('getProfile', () => {
    it('returns the public fields of the account, with its role', async () => {
      repository.findById.mockResolvedValue({ ...ana, passwordHash: 'x' });

      await expect(service.getProfile(ana.id)).resolves.toEqual(ana);
    });

    it('throws NotFoundException for an unknown account', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getProfile(ana.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  it('reads the session of an account', async () => {
    repository.findSession.mockResolvedValue({ tokensValidAfter: null });

    await expect(service.getSession(ana.id)).resolves.toEqual({
      tokensValidAfter: null,
    });
  });

  describe('getRole', () => {
    it('reads the role of the account', async () => {
      repository.findById.mockResolvedValue({ ...ana, role: 'ADMIN' });

      await expect(service.getRole(ana.id)).resolves.toBe('ADMIN');
    });

    it('treats a deleted account as a plain user', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getRole(ana.id)).resolves.toBe('USER');
    });
  });

  it('revokes the tokens from the next whole second on', async () => {
    vi.useFakeTimers({ now: new Date('2026-07-01T10:00:00.400Z') });

    await service.revokeTokens(ana.id);

    expect(repository.revokeTokens).toHaveBeenCalledWith(
      ana.id,
      new Date('2026-07-01T10:00:01.000Z'),
    );
  });

  describe('update', () => {
    it('changes only the name and the email of your own account', async () => {
      repository.findById.mockResolvedValue(ana);
      repository.update.mockResolvedValue({ ...ana, name: 'Ana S.' });

      await expect(
        service.update(ana.id, { name: 'Ana S.' }, caller),
      ).resolves.toMatchObject({ name: 'Ana S.' });
      expect(repository.update).toHaveBeenCalledWith(ana.id, {
        name: 'Ana S.',
        email: undefined,
      });
    });

    it('forbids changing someone else’s account before looking it up', async () => {
      await expect(
        service.update(ana.id, { name: 'X' }, stranger),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('answers 404 when the account is gone', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.update(ana.id, { name: 'X' }, caller),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes your own account', async () => {
      repository.findById.mockResolvedValue(ana);

      await service.remove(ana.id, caller);

      expect(repository.remove).toHaveBeenCalledWith(ana.id);
    });

    it('forbids deleting someone else’s account', async () => {
      await expect(service.remove(ana.id, stranger)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('answers 404 when the account is gone', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(ana.id, caller)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  it('groups the destinations of the completed trips by country', async () => {
    repository.findVisitedPlaces.mockResolvedValue([
      { tripId: 't1', country: 'Brasil', countryCode: 'BR' },
      { tripId: 't2', country: 'brasil', countryCode: 'br' },
      { tripId: 't2', country: 'Argentina', countryCode: null },
    ]);

    await expect(service.findVisitedCountries(ana.id)).resolves.toEqual([
      { country: 'Argentina', countryCode: null, tripCount: 1 },
      { country: 'Brasil', countryCode: 'BR', tripCount: 2 },
    ]);
  });
});
