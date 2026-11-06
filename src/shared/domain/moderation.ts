export const CATALOG_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

type Role = 'USER' | 'ADMIN';

export interface Moderated {
  status: CatalogStatus;
  createdBy: string | null;
  rejectionReason: string | null;
}

export interface Moderator {
  id: string;
  role: Role;
}

export const initialStatus = (role: Role): CatalogStatus =>
  role === 'ADMIN' ? 'APPROVED' : 'PENDING';

export function canChange(entry: Moderated, actor: Moderator): boolean {
  if (actor.role === 'ADMIN') return true;

  return entry.createdBy === actor.id && entry.status !== 'APPROVED';
}

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

export const isAlready = (entry: Moderated, decision: ModerationDecision) =>
  entry.status === decision;
