import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';

export interface AccessToken {
  value: string;
  expiresIn: number;
}

export abstract class AccessTokenIssuer {
  abstract issue(user: AuthenticatedUser): Promise<AccessToken>;
}
