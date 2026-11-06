import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripMember } from '../domain/trip-member.entity.js';
import type { TripMemberRepository } from '../domain/trip-member.repository.js';
import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';
import type { EventPublisher } from '@shared/events/app-events.js';
import type { TripAccessService } from '@modules/trip-access/application/trip-access.service.js';
import { TripMembersService } from './trip-members.service.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@shared/domain/errors.js';

const base: TripMember = {
  id: '33333333-3333-4333-8333-333333333333',
  tripId: '22222222-2222-4222-8222-222222222222',
  userId: '11111111-1111-4111-8111-111111111111',
  permission: 'EDITOR',
  joinedAt: new Date('2026-03-15T09:10:00.000Z'),
};

const entity = (overrides: Partial<TripMember> = {}): TripMember => ({
  ...base,
  ...overrides,
});

const user: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@example.com',
};
const tripId = '22222222-2222-4222-8222-222222222222';

type RepoMock = {
  [K in keyof TripMemberRepository]: ReturnType<typeof vi.fn>;
};
type AccessMock = {
  [K in keyof TripAccessService]: ReturnType<typeof vi.fn>;
};

describe('TripMembersService', () => {
  let repository: RepoMock;
  let access: AccessMock;
  let events: { publish: ReturnType<typeof vi.fn> };
  let service: TripMembersService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      findByTripAndUser: vi.fn().mockResolvedValue(null),
    };
    access = {
      assertCanRead: vi.fn().mockResolvedValue('CREATOR'),
      assertCanEdit: vi.fn().mockResolvedValue('CREATOR'),
      assertIsCreator: vi.fn().mockResolvedValue('CREATOR'),
    } as AccessMock;
    events = { publish: vi.fn() };
    service = new TripMembersService(
      repository as unknown as TripMemberRepository,
      access as unknown as TripAccessService,
      events as unknown as EventPublisher,
    );
  });

  describe('findAll', () => {
    it('scopes the page to the caller and turns page and limit into a skip/take window', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({ page: 3, limit: 15 }, user);

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 30, take: 15 },
        user.id,
        { tripId: undefined },
      );
    });

    it('falls back to the default window when the query is empty', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({}, user);

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 0, take: 20 },
        user.id,
        { tripId: undefined },
      );
    });

    it('lists one trip only after checking the caller can read it', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({ tripId }, user);

      expect(access.assertCanRead).toHaveBeenCalledWith(tripId, user.id);
      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 0, take: 20 },
        user.id,
        { tripId },
      );
    });

    it('answers 404 for a trip the caller has no access to', async () => {
      access.assertCanRead.mockRejectedValue(new NotFoundError('Not found'));

      await expect(service.findAll({ tripId }, user)).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(repository.findAll).not.toHaveBeenCalled();
    });

    it('wraps the page in the { data, meta } envelope', async () => {
      repository.findAll.mockResolvedValue({ items: [entity()], total: 41 });

      const result = await service.findAll({ page: 2, limit: 20 }, user);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 2,
        limit: 20,
        total: 41,
        totalPages: 3,
        hasNext: true,
        hasPrevious: true,
      });
    });
  });

  describe('findOne', () => {
    it('returns the mapped response after checking read access', async () => {
      repository.findById.mockResolvedValue(entity());

      const result = await service.findOne(base.id, user);

      expect(result.id).toBe(base.id);
      expect(access.assertCanRead).toHaveBeenCalledWith(tripId, user.id);
    });

    it('throws NotFoundError when the record does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(base.id, user)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('hides the record from someone with no access to the trip', async () => {
      repository.findById.mockResolvedValue(entity());
      access.assertCanRead.mockRejectedValue(new NotFoundError('Not found'));

      await expect(service.findOne(base.id, user)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('create', () => {
    it('checks the assertIsCreator permission on the trip, then forwards the payload', async () => {
      repository.create.mockResolvedValue(entity());

      await service.create(
        {
          tripId,
          userId: '99999999-9999-4999-8999-999999999999',
          permission: 'VIEWER',
        },
        user,
      );

      expect(access.assertIsCreator).toHaveBeenCalledWith(tripId, user.id);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId,
          userId: '99999999-9999-4999-8999-999999999999',
          permission: 'VIEWER',
        }),
      );
    });

    it('does not create when the caller lacks permission', async () => {
      access.assertIsCreator.mockRejectedValue(new ForbiddenError('Forbidden'));

      await expect(
        service.create(
          {
            tripId,
            userId: '99999999-9999-4999-8999-999999999999',
            permission: 'VIEWER',
          },
          user,
        ),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates an existing record after checking the assertIsCreator permission', async () => {
      repository.findById.mockResolvedValue(entity());
      repository.update.mockResolvedValue(entity());

      await service.update(base.id, {}, user);

      expect(access.assertIsCreator).toHaveBeenCalledWith(tripId, user.id);
      expect(repository.update).toHaveBeenCalledWith(base.id, {});
    });

    it('does not touch the repository when the record is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(base.id, {}, user)).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('does not update when the caller lacks permission', async () => {
      repository.findById.mockResolvedValue(entity());
      access.assertIsCreator.mockRejectedValue(new ForbiddenError('Forbidden'));

      await expect(service.update(base.id, {}, user)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing record after checking the assertIsCreator permission', async () => {
      repository.findById.mockResolvedValue(entity());
      repository.remove.mockResolvedValue(undefined);

      await service.remove(base.id, user);

      expect(access.assertIsCreator).toHaveBeenCalledWith(tripId, user.id);
      expect(repository.remove).toHaveBeenCalledWith(base.id);
    });

    it('does not delete when the record is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(base.id, user)).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('does not delete when the caller lacks permission', async () => {
      repository.findById.mockResolvedValue(entity());
      access.assertIsCreator.mockRejectedValue(new ForbiddenError('Forbidden'));

      await expect(service.remove(base.id, user)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  it('refuses to add the trip creator as a member', async () => {
    await expect(
      service.create({ tripId, userId: user.id, permission: 'VIEWER' }, user),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  describe('addMember', () => {
    it('adds a user to a trip', async () => {
      repository.create.mockResolvedValue(entity());

      await service.addMember(tripId, base.userId, 'VIEWER');

      expect(repository.findByTripAndUser).toHaveBeenCalledWith(
        tripId,
        base.userId,
      );
      expect(repository.create).toHaveBeenCalledWith({
        tripId,
        userId: base.userId,
        permission: 'VIEWER',
      });
    });

    it('answers 409 when the user is already a member', async () => {
      repository.findByTripAndUser.mockResolvedValue(entity());

      await expect(
        service.addMember(tripId, base.userId, 'VIEWER'),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('notifications', () => {
    it('announces a member who joins, as done by whoever invited them', async () => {
      repository.create.mockResolvedValue(entity());

      await service.addMember(tripId, base.userId, 'VIEWER', user.id);

      expect(events.publish).toHaveBeenCalledWith({
        kind: 'trip',
        type: 'MEMBER_JOINED',
        tripId,
        actorId: user.id,
        subjectId: base.userId,
        details: { permission: 'VIEWER' },
      });
    });

    it('takes the person who joins with a code as the one who did it', async () => {
      repository.create.mockResolvedValue(entity());

      await service.addMember(tripId, base.userId, 'VIEWER');

      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: base.userId }),
      );
    });

    it('says nothing when the user is already a member', async () => {
      repository.findByTripAndUser.mockResolvedValue(entity());

      await expect(
        service.addMember(tripId, base.userId, 'VIEWER'),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(events.publish).not.toHaveBeenCalled();
    });

    it('announces a permission that changes, with the old and the new one', async () => {
      repository.findById.mockResolvedValue(entity({ permission: 'VIEWER' }));
      repository.update.mockResolvedValue(entity({ permission: 'EDITOR' }));

      await service.update(base.id, { permission: 'EDITOR' }, user);

      expect(events.publish).toHaveBeenCalledWith({
        kind: 'trip',
        type: 'MEMBER_PERMISSION_CHANGED',
        tripId: base.tripId,
        actorId: user.id,
        subjectId: base.userId,
        details: { from: 'VIEWER', to: 'EDITOR' },
      });
    });

    it('says nothing when the permission stays the same', async () => {
      repository.findById.mockResolvedValue(entity({ permission: 'EDITOR' }));
      repository.update.mockResolvedValue(entity({ permission: 'EDITOR' }));

      await service.update(base.id, { permission: 'EDITOR' }, user);

      expect(events.publish).not.toHaveBeenCalled();
    });

    it('announces a removed member and makes sure they hear it too', async () => {
      repository.findById.mockResolvedValue(entity());
      repository.remove.mockResolvedValue(undefined);

      await service.remove(base.id, user);

      expect(events.publish).toHaveBeenCalledWith({
        kind: 'trip',
        type: 'MEMBER_REMOVED',
        tripId: base.tripId,
        actorId: user.id,
        subjectId: base.userId,
        alsoNotify: [base.userId],
      });
    });

    it('says nothing when the removal is refused', async () => {
      repository.findById.mockResolvedValue(entity());
      access.assertIsCreator.mockRejectedValue(new ForbiddenError('Forbidden'));

      await expect(service.remove(base.id, user)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(events.publish).not.toHaveBeenCalled();
    });
  });
});
