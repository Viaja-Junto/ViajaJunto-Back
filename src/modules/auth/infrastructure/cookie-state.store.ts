import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request } from 'express';

export const OAUTH_STATE_COOKIE = 'vj_oauth_state';

const STATE_TTL_MS = 10 * 60 * 1000;

interface CookieStateStoreOptions {
  secure: boolean;
  path: string;
}

type StoreCallback = (err: Error | null, state?: string) => void;
type VerifyCallback = (
  err: Error | null,
  ok: boolean,
  info?: string | { message: string },
) => void;

// OAuth `state` kept in a cookie (the API has no session) to stop login CSRF.
// Keep the arities: passport-oauth2 picks the signature from store.length (2) and verify.length (3).
export class CookieStateStore {
  constructor(private readonly options: CookieStateStoreOptions) {}

  store(req: Request, callback: StoreCallback): void {
    if (!req.res) {
      callback(new Error('OAuth state store needs the Express response'));
      return;
    }

    const state = randomBytes(32).toString('base64url');
    req.res.cookie(OAUTH_STATE_COOKIE, state, {
      ...this.cookieOptions(),
      maxAge: STATE_TTL_MS,
    });
    callback(null, state);
  }

  verify(req: Request, providedState: string, callback: VerifyCallback): void {
    const expectedState = readCookie(req.headers.cookie, OAUTH_STATE_COOKIE);

    req.res?.clearCookie(OAUTH_STATE_COOKIE, this.cookieOptions());

    if (!expectedState || !providedState) {
      callback(null, false, { message: 'Missing OAuth state.' });
      return;
    }

    if (!safeEqual(expectedState, providedState)) {
      callback(null, false, { message: 'OAuth state does not match.' });
      return;
    }

    callback(null, true, providedState);
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      // Lax still sends the cookie on Google's top-level redirect back to us.
      sameSite: 'lax',
      secure: this.options.secure,
      path: this.options.path,
    };
  }
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) {
    return null;
  }

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator !== -1 && part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }

  return null;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}
