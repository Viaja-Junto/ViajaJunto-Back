import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
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
import type { AuthenticatedUser } from '@modules/auth/domain/authenticated-user.entity.js';
import { UsersService } from '@modules/users/application/users.service.js';

const ADMIN_ONLY = 'Only an administrator can do this';
const LOCKED =
  'Only an administrator can change an approved entry, and only its author can change a suggestion';

/** The moderation rules applied to every catalog; the role is read from the database on each call. */
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
      throw new ForbiddenException(ADMIN_ONLY);
    }
  }

  /** Checks the caller may change the entry and returns what the edit does to its status. */
  async assertCanChange(
    entry: Moderated,
    user: AuthenticatedUser,
  ): Promise<Pick<Moderated, 'status' | 'rejectionReason'> | null> {
    const actor = await this.moderator(user);

    if (!canChange(entry, actor)) {
      throw new ForbiddenException(LOCKED);
    }

    return afterEdit(entry, actor);
  }

  /**
   * Checks an administrator may record this decision and tells the author once
   * `save` succeeds.
   */
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
      throw new ConflictException(
        `The entry is already ${decision.toLowerCase()}`,
      );
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
