import { describe, expect, it } from 'vitest';
import {
  afterEdit,
  canChange,
  initialStatus,
  isAlready,
  type Moderated,
} from './moderation.js';

const entry = (overrides: Partial<Moderated> = {}): Moderated => ({
  status: 'PENDING',
  createdBy: 'ana',
  rejectionReason: null,
  ...overrides,
});
const ana = { id: 'ana', role: 'USER' } as const;
const bia = { id: 'bia', role: 'USER' } as const;
const admin = { id: 'root', role: 'ADMIN' } as const;

describe('initialStatus', () => {
  it('publishes an administrator’s entry at once', () => {
    expect(initialStatus('ADMIN')).toBe('APPROVED');
  });

  it('sends anyone else’s to review', () => {
    expect(initialStatus('USER')).toBe('PENDING');
  });
});

describe('canChange', () => {
  it.each(['PENDING', 'REJECTED'] as const)(
    'lets the author change their %s entry',
    (status) => {
      expect(canChange(entry({ status }), ana)).toBe(true);
    },
  );

  it('stops the author once the entry is approved', () => {
    expect(canChange(entry({ status: 'APPROVED' }), ana)).toBe(false);
  });

  it('never lets another user change it', () => {
    expect(canChange(entry(), bia)).toBe(false);
  });

  it.each(['PENDING', 'APPROVED', 'REJECTED'] as const)(
    'lets an administrator change a %s entry',
    (status) => {
      expect(canChange(entry({ status }), admin)).toBe(true);
    },
  );

  it('lets nobody but an administrator change an entry whose author is gone', () => {
    expect(canChange(entry({ createdBy: null }), ana)).toBe(false);
    expect(canChange(entry({ createdBy: null }), admin)).toBe(true);
  });
});

describe('afterEdit', () => {
  it('sends a rejected entry fixed by its author back to review', () => {
    expect(
      afterEdit(
        entry({ status: 'REJECTED', rejectionReason: 'Duplicado' }),
        ana,
      ),
    ).toEqual({ status: 'PENDING', rejectionReason: null });
  });

  it('leaves a pending entry as it is', () => {
    expect(afterEdit(entry(), ana)).toBeNull();
  });

  it('never changes the status when an administrator edits', () => {
    expect(afterEdit(entry({ status: 'REJECTED' }), admin)).toBeNull();
  });
});

describe('isAlready', () => {
  it('spots a decision that would change nothing', () => {
    expect(isAlready(entry({ status: 'APPROVED' }), 'APPROVED')).toBe(true);
    expect(isAlready(entry({ status: 'PENDING' }), 'APPROVED')).toBe(false);
  });
});
