// Moderation of the catalogs: users suggest entries, administrators approve or
// reject them. Pure rules; no framework and no ORM dependency.

export const CATALOG_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

type Role = 'USER' | 'ADMIN';

/** What every moderated catalog entry carries. */
export interface Moderated {
  status: CatalogStatus;
  /** Who suggested it; null once that account is deleted. */
  createdBy: string | null;
  /** Why an administrator rejected it; null otherwise. */
  rejectionReason: string | null;
}

export interface Moderator {
  id: string;
  role: Role;
}

/** An administrator's entry is published at once; anyone else's waits for review. */
export const initialStatus = (role: Role): CatalogStatus =>
  role === 'ADMIN' ? 'APPROVED' : 'PENDING';

/**
 * Administrators change any entry. The author changes theirs only while it is
 * not published, so an approved entry is never altered without review.
 */
export function canChange(entry: Moderated, actor: Moderator): boolean {
  if (actor.role === 'ADMIN') return true;

  return entry.createdBy === actor.id && entry.status !== 'APPROVED';
}

/**
 * What an edit does to the status: when the author fixes a rejected entry it
 * goes back to the review queue and loses the old reason.
 */
export function afterEdit(
  entry: Moderated,
  actor: Moderator,
): Pick<Moderated, 'status' | 'rejectionReason'> | null {
  if (actor.role !== 'ADMIN' && entry.status === 'REJECTED') {
    return { status: 'PENDING', rejectionReason: null };
  }

  return null;
}

export type ModerationDecision = 'APPROVED' | 'REJECTED';

/** Approving an approved entry, or rejecting a rejected one, changes nothing and is refused. */
export const isAlready = (entry: Moderated, decision: ModerationDecision) =>
  entry.status === decision;
