import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthService } from '../application/auth.service.js';
import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  let service: Record<keyof AuthService, ReturnType<typeof vi.fn>>;
  let controller: AuthController;

  beforeEach(() => {
    service = { register: vi.fn(), login: vi.fn(), getProfile: vi.fn() };
    controller = new AuthController(service as unknown as AuthService);
  });

  it('forwards the body on register', () => {
    const dto = {
      name: 'Ana',
      email: 'ana@example.com',
      password: 'x'.repeat(8),
    };

    controller.register(dto);

    expect(service.register).toHaveBeenCalledWith(dto);
  });

  it('forwards the body on login', () => {
    const dto = { email: 'ana@example.com', password: 'secret' };

    controller.login(dto);

    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('reads the profile of the authenticated caller', () => {
    controller.me({ id: 'user-id', email: 'ana@example.com' });

    expect(service.getProfile).toHaveBeenCalledWith('user-id');
  });
});
