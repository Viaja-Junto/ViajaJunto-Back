import { ConflictException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventPublisher } from '@shared/events/app-events.js';
import type { UsersService } from '@modules/users/application/users.service.js';
import { ModerationService } from './moderation.service.js';

const ana = { id: 'ana', email: 'ana@example.com' };
const admin = { id: 'root', email: 'admin@example.com' };
const spot = {
  id: 'spot',
  name: 'Usina do Gasômetro',
  status: 'PENDING' as const,
  createdBy: 'ana',
  rejectionReason: null,
};

describe('ModerationService', () => {
  let users: { getRole: ReturnType<typeof vi.fn> };
  let events: { publish: ReturnType<typeof vi.fn> };
  let service: ModerationService;

  beforeEach(() => {
    users = {
      getRole: vi.fn(async (id: string) => (id === 'root' ? 'ADMIN' : 'USER')),
    };
    events = { publish: vi.fn() };
    service = new ModerationService(
      users as unknown as UsersService,
      events as unknown as EventPublisher,
    );
  });

  it('publishes an administrator’s entry and queues anyone else’s', async () => {
    await expect(service.statusFor(admin)).resolves.toBe('APPROVED');
    await expect(service.statusFor(ana)).resolves.toBe('PENDING');
  });

  it('refuses administrator actions to everyone else', async () => {
    await expect(service.assertAdmin(ana)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.assertAdmin(admin)).resolves.toBeUndefined();
  });

  describe('assertCanChange', () => {
    it('lets the author edit a suggestion and reopens a rejected one', async () => {
      await expect(service.assertCanChange(spot, ana)).resolves.toBeNull();
      await expect(
        service.assertCanChange({ ...spot, status: 'REJECTED' }, ana),
      ).resolves.toEqual({ status: 'PENDING', rejectionReason: null });
    });

    it('answers 403 when the author touches an approved entry', async () => {
      await expect(
        service.assertCanChange({ ...spot, status: 'APPROVED' }, ana),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('review', () => {
    it('saves the decision and tells the author', async () => {
      const save = vi.fn().mockResolvedValue({ ...spot, status: 'REJECTED' });

      await service.review(
        'TOURIST_SPOT',
        spot,
        'REJECTED',
        admin,
        save,
        'Duplicado',
      );

      expect(save).toHaveBeenCalled();
      expect(events.publish).toHaveBeenCalledWith({
        kind: 'submission',
        type: 'SUBMISSION_REJECTED',
        actorId: 'root',
        authorId: 'ana',
        catalog: 'TOURIST_SPOT',
        subjectId: 'spot',
        subjectName: 'Usina do Gasômetro',
        reason: 'Duplicado',
      });
    });

    it('is refused to anyone but an administrator', async () => {
      const save = vi.fn();

      await expect(
        service.review('TOURIST_SPOT', spot, 'APPROVED', ana, save),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(save).not.toHaveBeenCalled();
    });

    it('answers 409 for a decision that changes nothing', async () => {
      await expect(
        service.review(
          'TOURIST_SPOT',
          { ...spot, status: 'APPROVED' },
          'APPROVED',
          admin,
          vi.fn(),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('tells nobody when the author’s account is gone', async () => {
      const save = vi.fn().mockResolvedValue(spot);

      await service.review(
        'DESTINATION',
        { ...spot, createdBy: null },
        'APPROVED',
        admin,
        save,
      );

      expect(events.publish).not.toHaveBeenCalled();
    });
  });
});
