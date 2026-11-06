import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  type ExecutionContext,
} from '@nestjs/common';
import { isGoogleConfigured } from '@shared/config/env.js';
import { AuthGuard } from '@nestjs/passport';
import type { GoogleIdentity } from '@modules/users/domain/google-identity.entity.js';
import { GOOGLE_STRATEGY } from '../../auth.constants.js';

@Injectable()
export class GoogleAuthGuard extends AuthGuard(GOOGLE_STRATEGY) {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  canActivate(context: ExecutionContext) {
    if (!isGoogleConfigured()) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured on this server',
      );
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = GoogleIdentity>(
    err: unknown,
    user: TUser | false,
    info: unknown,
  ): TUser | null {
    if (err || !user) {
      this.logger.warn(
        `Google sign-in failed: ${describe(err ?? info ?? 'no user')}`,
      );
      return null;
    }

    return user;
  }
}

function describe(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }
  if (typeof reason === 'object' && reason !== null && 'message' in reason) {
    return String(reason.message);
  }
  return String(reason);
}
