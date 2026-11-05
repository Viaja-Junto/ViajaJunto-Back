import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { env } from '@shared/config/env.js';
import {
  AccessToken,
  AccessTokenIssuer,
} from '../domain/access-token.issuer.js';
import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
}

@Injectable()
export class JwtAccessTokenIssuer implements AccessTokenIssuer {
  constructor(private readonly jwt: JwtService) {}

  async issue(user: AuthenticatedUser): Promise<AccessToken> {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    return {
      value: await this.jwt.signAsync(payload),
      expiresIn: env.JWT_EXPIRES_IN,
    };
  }
}
