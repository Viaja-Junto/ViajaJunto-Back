import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from '@shared/config/env.js';
import { UsersService } from '@modules/users/application/users.service.js';
import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';
import { JWT_STRATEGY } from '../auth.constants.js';
import type { JwtPayload } from './jwt-access-token.issuer.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY) {
  constructor(private readonly users: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
      // Pinned so a token signed with another algorithm is never accepted.
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const session = await this.users.getSession(payload.sub);

    if (!session) {
      throw new UnauthorizedException('The account no longer exists');
    }

    const issuedAt = (payload.iat ?? 0) * 1000;
    if (
      session.tokensValidAfter &&
      issuedAt < session.tokensValidAfter.getTime()
    ) {
      throw new UnauthorizedException('The session has ended: sign in again');
    }

    return { id: payload.sub, email: payload.email };
  }
}
