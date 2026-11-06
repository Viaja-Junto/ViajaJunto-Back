import { Injectable } from '@nestjs/common';
import { EventPublisher, type CatalogKind } from '@shared/events/app-events.js';
import {
  afterEdit,
  canChange,
  initialStatus,
  isAlready,
  type CatalogStatus,
  type Moderated,
  type ModerationDecision,
  type Moderator,
} from '@shared/domain/moderation.js';
import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';
import { UsersService } from '@modules/users/application/users.service.js';
import { ConflictError, ForbiddenError } from '@shared/domain/errors.js';

const ADMIN_ONLY = 'Only an administrator can do this';
const LOCKED =
  'Only an administrator can change an approved entry, and only its author can change a suggestion';

@Injectable()
export class ModerationService {
  constructor(
    private readonly users: UsersService,
    private readonly events: EventPublisher,
  ) {}

  async moderator(user: AuthenticatedUser): Promise<Moderator> {
    return { id: user.id, role: await this.users.getRole(user.id) };
  }

  async isAdmin(user: AuthenticatedUser): Promise<boolean> {
    return (await this.users.getRole(user.id)) === 'ADMIN';
  }

  async statusFor(user: AuthenticatedUser): Promise<CatalogStatus> {
    return initialStatus((await this.moderator(user)).role);
  }

  async assertAdmin(user: AuthenticatedUser): Promise<void> {
    if (!(await this.isAdmin(user))) {
      throw new ForbiddenError(ADMIN_ONLY);
    }
  }

  async assertCanChange(
    entry: Moderated,
    user: AuthenticatedUser,
  ): Promise<Pick<Moderated, 'status' | 'rejectionReason'> | null> {
    const actor = await this.moderator(user);

    if (!canChange(entry, actor)) {
      throw new ForbiddenError(LOCKED);
    }

    return afterEdit(entry, actor);
  }

  async review<T extends Moderated & { id: string; name: string }>(
    catalog: CatalogKind,
    entry: T,
    decision: ModerationDecision,
    user: AuthenticatedUser,
    save: () => Promise<T>,
    reason?: string,
  ): Promise<T> {
    await this.assertAdmin(user);

    if (isAlready(entry, decision)) {
      throw new ConflictError(`The entry is already ${decision.toLowerCase()}`);
    }

    const saved = await save();

    if (entry.createdBy) {
      this.events.publish({
        kind: 'submission',
        type:
          decision === 'APPROVED'
            ? 'SUBMISSION_APPROVED'
            : 'SUBMISSION_REJECTED',
        actorId: user.id,
        authorId: entry.createdBy,
        catalog,
        subjectId: entry.id,
        subjectName: entry.name,
        ...(reason ? { reason } : {}),
      });
    }

    return saved;
  }
}
