import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsersService } from '../../users/application/users.service.js';
import type { UserCredentials } from '../../users/domain/user.entity.js';
import type { UserRepository } from '../../users/domain/user.repository.js';
import type { AccessTokenIssuer } from '../domain/access-token.issuer.js';
import type { PasswordHasher } from '../domain/password-hasher.js';
import { AuthService } from './auth.service.js';

const account: UserCredentials = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ana Souza',
  email: 'ana@example.com',
  role: 'USER',
  passwordHash: 'scrypt:salt:key',
  createdAt: new Date('2026-03-14T18:22:05.000Z'),
};

const token = { value: 'signed.jwt.token', expiresIn: 3600 };

describe('AuthService', () => {
  let users: Record<keyof UserRepository, ReturnType<typeof vi.fn>>;
  let profiles: {
    getProfile: ReturnType<typeof vi.fn>;
    revokeTokens: ReturnType<typeof vi.fn>;
  };
  let hasher: Record<keyof PasswordHasher, ReturnType<typeof vi.fn>>;
  let tokens: { issue: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    users = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findCredentialsByEmail: vi.fn(),
      findSession: vi.fn(),
      revokeTokens: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    profiles = { getProfile: vi.fn(), revokeTokens: vi.fn() };
    hasher = {
      hash: vi.fn().mockResolvedValue('scrypt:new:hash'),
      verify: vi.fn(),
    };
    tokens = { issue: vi.fn().mockResolvedValue(token) };
    service = new AuthService(
      users as unknown as UserRepository,
      profiles as unknown as UsersService,
      hasher as unknown as PasswordHasher,
      tokens as unknown as AccessTokenIssuer,
    );
  });

  describe('register', () => {
    const dto = {
      name: 'Ana Souza',
      email: 'ana@example.com',
      password: 'viaja-junto-2026',
    };

    it('stores the hash, never the password', async () => {
      users.findCredentialsByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue(account);

      await service.register(dto);

      expect(hasher.hash).toHaveBeenCalledWith(dto.password);
      expect(users.create).toHaveBeenCalledWith({
        name: dto.name,
        email: dto.email,
        passwordHash: 'scrypt:new:hash',
      });
    });

    it('signs the new account in', async () => {
      users.findCredentialsByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue(account);

      await expect(service.register(dto)).resolves.toEqual({
        accessToken: token.value,
        tokenType: 'Bearer',
        expiresIn: token.expiresIn,
      });
      expect(tokens.issue).toHaveBeenCalledWith(account);
    });

    it('refuses an email that is already taken', async () => {
      users.findCredentialsByEmail.mockResolvedValue(account);

      await expect(service.register(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto = { email: account.email, password: 'viaja-junto-2026' };

    it('issues a token for the right password', async () => {
      users.findCredentialsByEmail.mockResolvedValue(account);
      hasher.verify.mockResolvedValue(true);

      await expect(service.login(dto)).resolves.toMatchObject({
        accessToken: token.value,
      });
      expect(hasher.verify).toHaveBeenCalledWith(
        dto.password,
        account.passwordHash,
      );
      expect(tokens.issue).toHaveBeenCalledWith({
        id: account.id,
        email: account.email,
      });
    });

    it('refuses a wrong password with 401', async () => {
      users.findCredentialsByEmail.mockResolvedValue(account);
      hasher.verify.mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
      expect(tokens.issue).not.toHaveBeenCalled();
    });

    it('answers an unknown email exactly like a wrong password', async () => {
      users.findCredentialsByEmail.mockResolvedValue(null);
      hasher.verify.mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });

    it('still runs the hash check for an unknown email, so timing does not tell them apart', async () => {
      users.findCredentialsByEmail.mockResolvedValue(null);
      hasher.verify.mockResolvedValue(true);

      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(hasher.verify).toHaveBeenCalledTimes(2);
      expect(hasher.hash).toHaveBeenCalledTimes(1);
    });
  });

  it('reads the profile of the caller', async () => {
    profiles.getProfile.mockResolvedValue({ id: account.id });

    await expect(service.getProfile(account.id)).resolves.toEqual({
      id: account.id,
    });
    expect(profiles.getProfile).toHaveBeenCalledWith(account.id);
  });

  it('signs out by revoking every token of the caller', async () => {
    await service.signOut(account.id);

    expect(profiles.revokeTokens).toHaveBeenCalledWith(account.id);
  });
});
