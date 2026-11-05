import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../modules/auth/domain/authenticated-user.entity.js';

/** Only whoever created a record may change or delete it. */
export function assertOwner(
  ownerId: string,
  user: AuthenticatedUser,
  message: string,
): void {
  if (ownerId !== user.id) {
    throw new ForbiddenException(message);
  }
}
