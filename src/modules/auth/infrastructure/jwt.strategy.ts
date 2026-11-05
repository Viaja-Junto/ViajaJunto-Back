import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from '../../../shared/config/env.js';
import { UsersService } from '../../users/application/users.service.js';
import type { AuthenticatedUser } from '../domain/authenticated-user.entity.js';
import type { JwtPayload } from './jwt-access-token.issuer.js';

export const JWT_STRATEGY = 'jwt';

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

  /** A valid signature is not enough: the account must still exist. */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!(await this.users.exists(payload.sub))) {
      throw new UnauthorizedException('The account no longer exists');
    }

    return { id: payload.sub, email: payload.email };
  }
}
