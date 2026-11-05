import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';
import { ForbiddenError } from '@shared/domain/errors.js';

/** Only whoever created a record may change or delete it. */
export function assertOwner(
  ownerId: string,
  user: AuthenticatedUser,
  message: string,
): void {
  if (ownerId !== user.id) {
    throw new ForbiddenError(message);
  }
}
