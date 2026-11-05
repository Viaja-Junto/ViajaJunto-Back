import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthService } from '../application/auth.service.js';
import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  let service: Record<keyof AuthService, ReturnType<typeof vi.fn>>;
  let controller: AuthController;

  beforeEach(() => {
    service = {
      register: vi.fn(),
      login: vi.fn(),
      getProfile: vi.fn(),
      signOut: vi.fn(),
      signInWithGoogle: vi.fn(),
    };
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

  it('signs the caller out', () => {
    controller.logout({ id: 'user-id', email: 'ana@example.com' });

    expect(service.signOut).toHaveBeenCalledWith('user-id');
  });

  describe('googleCallback', () => {
    const response = () => ({ redirect: vi.fn() });

    it('redirects to the frontend with the token in the URL fragment', async () => {
      service.signInWithGoogle.mockResolvedValue({
        accessToken: 'jwt',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
      const res = response();
      const identity = { googleId: 'g', email: 'ana@example.com', name: 'Ana' };

      await controller.googleCallback(
        { user: identity } as never,
        res as never,
      );

      expect(service.signInWithGoogle).toHaveBeenCalledWith(identity);
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/auth/callback#access_token=jwt&token_type=Bearer&expires_in=3600',
      );
    });

    it('redirects with an error code when the guard rejected the sign-in', async () => {
      const res = response();

      await controller.googleCallback({ user: null } as never, res as never);

      expect(service.signInWithGoogle).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/auth/callback#error=google_sign_in_failed',
      );
    });
  });

  it('leaves the Google entry point to the guard', () => {
    expect(controller.googleSignIn()).toBeUndefined();
  });
});
