import type { AuthenticatedUser } from './authenticated-user.entity.js';

export interface AccessToken {
  value: string;
  /** Lifetime, in seconds. */
  expiresIn: number;
}

export abstract class AccessTokenIssuer {
  abstract issue(user: AuthenticatedUser): Promise<AccessToken>;
}
