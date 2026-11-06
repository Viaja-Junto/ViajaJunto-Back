import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureAccessToken } from './swagger-ui.js';

describe('captureAccessToken', () => {
  const preauthorizeApi = vi.fn();
  const browser = globalThis as unknown as { ui?: unknown };

  afterEach(() => {
    delete browser.ui;
    preauthorizeApi.mockReset();
  });

  it.each(['/api/auth/login', '/api/auth/register'])(
    'authorizes every route with the token returned by %s',
    (path) => {
      browser.ui = { preauthorizeApi };
      const response = {
        url: `http://localhost:3000${path}`,
        ok: true,
        obj: { accessToken: 'eyJ.token' },
      };

      expect(captureAccessToken(response)).toBe(response);
      expect(preauthorizeApi).toHaveBeenCalledWith('bearer', 'eyJ.token');
    },
  );

  it('ignores failed sign-ins and other routes', () => {
    browser.ui = { preauthorizeApi };

    captureAccessToken({
      url: 'http://localhost:3000/api/auth/login',
      ok: false,
      obj: {},
    });
    captureAccessToken({
      url: 'http://localhost:3000/api/trips',
      ok: true,
      obj: { accessToken: 'not-a-sign-in' },
    });

    expect(preauthorizeApi).not.toHaveBeenCalled();
  });

  it('does nothing outside the Swagger page', () => {
    expect(() =>
      captureAccessToken({
        url: 'http://localhost:3000/api/auth/login',
        ok: true,
        obj: { accessToken: 'eyJ.token' },
      }),
    ).not.toThrow();
  });
});
