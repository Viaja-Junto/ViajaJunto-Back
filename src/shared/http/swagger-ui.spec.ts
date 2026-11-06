import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureAccessToken } from './swagger-ui.js';

describe('captureAccessToken', () => {
  const preauthorizeApiKey = vi.fn();
  const browser = globalThis as unknown as { ui?: unknown };

  afterEach(() => {
    delete browser.ui;
    preauthorizeApiKey.mockReset();
  });

  it.each(['/api/auth/login', '/api/auth/register'])(
    'authorizes every route with the token returned by %s',
    (path) => {
      browser.ui = { preauthorizeApiKey };
      const response = {
        url: `http://localhost:3000${path}`,
        ok: true,
        obj: { accessToken: 'eyJ.token' },
      };

      expect(captureAccessToken(response)).toBe(response);
      expect(preauthorizeApiKey).toHaveBeenCalledWith('bearer', 'eyJ.token');
    },
  );

  it('ignores failed sign-ins and other routes', () => {
    browser.ui = { preauthorizeApiKey };

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

    expect(preauthorizeApiKey).not.toHaveBeenCalled();
  });

  it('never breaks the sign-in response when authorizing fails', () => {
    browser.ui = {
      preauthorizeApiKey: () => {
        throw new Error('no such scheme');
      },
    };
    const response = {
      url: 'http://localhost:3000/api/auth/login',
      ok: true,
      obj: { accessToken: 'eyJ.token' },
    };

    expect(captureAccessToken(response)).toBe(response);
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
