import type { PhotoStorageService } from '@shared/storage/application/photo-storage.service.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModerationService } from '@modules/moderation/application/moderation.service.js';
import type { Destination } from '../domain/destination.entity.js';
import type { DestinationRepository } from '../domain/destination.repository.js';
import { DestinationsService } from './destinations.service.js';
import { NotFoundError } from '@shared/domain/errors.js';

const base: Destination = {
  id: '7d1f0c2a-5b3e-4f6a-8c9d-0e1f2a3b4c5d',
  name: 'Gramado',
  country: 'Brasil',
  countryCode: 'BR',
  category: 'NATURE',
  description: null,
  latitude: null,
  longitude: null,
  photoUrl: null,
  averageRating: null,
  reviewCount: 0,
  status: 'APPROVED',
  rejectionReason: null,
  createdBy: 'ana',
  reviewedBy: null,
  reviewedAt: null,
  createdAt: new Date('2026-11-05T14:00:00.000Z'),
  updatedAt: new Date('2026-11-05T14:00:00.000Z'),
};
const entity = (overrides: Partial<Destination> = {}): Destination => ({
  ...base,
  ...overrides,
});
const ana = { id: 'ana', email: 'ana@example.com' };
const admin = { id: 'root', email: 'admin@example.com' };

describe('DestinationsService', () => {
  let repository: Record<keyof DestinationRepository, ReturnType<typeof vi.fn>>;
  let moderation: Record<
    'statusFor' | 'assertAdmin' | 'assertCanChange' | 'review',
    ReturnType<typeof vi.fn>
  >;
  let photos: {
    replace: ReturnType<typeof vi.fn>;
    discard: ReturnType<typeof vi.fn>;
  };
  let service: DestinationsService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn().mockResolvedValue({ items: [entity()], total: 1 }),
      findById: vi.fn().mockResolvedValue(entity()),
      findTopRated: vi.fn().mockResolvedValue([entity()]),
      create: vi.fn().mockResolvedValue(entity()),
      update: vi.fn().mockResolvedValue(entity()),
      remove: vi.fn(),
      findLatestReviews: vi.fn().mockResolvedValue([
        {
          id: 'r1',
          rating: 5,
          comment: 'Lindo',
          createdAt: new Date('2026-11-01T00:00:00.000Z'),
          authorName: 'Ana',
        },
      ]),
    };
    moderation = {
      statusFor: vi.fn().mockResolvedValue('PENDING'),
      assertAdmin: vi.fn(),
      assertCanChange: vi.fn().mockResolvedValue(null),
      review: vi.fn((_kind, _entry, _decision, _user, save) => save()),
    };
    photos = {
      replace: vi.fn(({ save }) => save('https://cdn.example.com/new.jpg')),
      discard: vi.fn(),
    };
    service = new DestinationsService(
      repository as unknown as DestinationRepository,
      moderation as unknown as ModerationService,
      photos as unknown as PhotoStorageService,
    );
  });

  it('shows the public only approved destinations, with the filters', async () => {
    const result = await service.findAll({
      q: 'gram',
      country: 'BR',
      category: 'NATURE',
    });

    expect(repository.findAll).toHaveBeenCalledWith(
      { skip: 0, take: 20 },
      { text: 'gram', country: 'BR', category: 'NATURE', status: 'APPROVED' },
    );
    expect(result.meta.total).toBe(1);
  });

  it('lists the caller’s suggestions and, for administrators, the queue', async () => {
    await service.findMine({}, ana);
    await service.findForModeration({ status: 'REJECTED' }, admin);

    expect(repository.findAll).toHaveBeenNthCalledWith(
      1,
      { skip: 0, take: 20 },
      { createdBy: 'ana', status: undefined },
    );
    expect(moderation.assertAdmin).toHaveBeenCalledWith(admin);
    expect(repository.findAll).toHaveBeenNthCalledWith(
      2,
      { skip: 0, take: 20 },
      { status: 'REJECTED' },
    );
  });

  it('lists the top rated destinations', async () => {
    await expect(service.findTop(3)).resolves.toHaveLength(1);
    expect(repository.findTopRated).toHaveBeenCalledWith(3);
  });

  describe('getApprovedOrFail', () => {
    it('returns a published destination', async () => {
      await expect(service.findOne(base.id)).resolves.toMatchObject({
        id: base.id,
      });
    });

    it('hides a destination that is not approved', async () => {
      repository.findById.mockResolvedValue(entity({ status: 'PENDING' }));

      await expect(service.getApprovedOrFail(base.id)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('answers 404 for an unknown destination', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(base.id)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  it('creates with the caller as author and the status from their role', async () => {
    await service.create({ name: 'Gramado', country: 'Brasil' }, ana);

    expect(repository.create).toHaveBeenCalledWith({
      name: 'Gramado',
      country: 'Brasil',
      createdBy: 'ana',
      status: 'PENDING',
    });
  });

  it('updates once moderation allows it, applying the reopened status', async () => {
    moderation.assertCanChange.mockResolvedValue({
      status: 'PENDING',
      rejectionReason: null,
    });

    await service.update(base.id, { description: 'Serra' }, ana);

    expect(repository.update).toHaveBeenCalledWith(base.id, {
      description: 'Serra',
      status: 'PENDING',
      rejectionReason: null,
    });
  });

  it('answers 404 when updating an unknown destination', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.update(base.id, {}, ana)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('approves and rejects through the moderation rules', async () => {
    await service.approve(base.id, admin);
    await service.reject(base.id, 'Fora do escopo', admin);

    expect(moderation.review).toHaveBeenCalledWith(
      'DESTINATION',
      entity(),
      'APPROVED',
      admin,
      expect.any(Function),
      undefined,
    );
    expect(repository.update).toHaveBeenLastCalledWith(
      base.id,
      expect.objectContaining({
        status: 'REJECTED',
        rejectionReason: 'Fora do escopo',
        reviewedBy: 'root',
      }),
    );
  });

  it('deletes once moderation allows it', async () => {
    await service.remove(base.id, ana);

    expect(moderation.assertCanChange).toHaveBeenCalledWith(entity(), ana);
    expect(repository.remove).toHaveBeenCalledWith(base.id);
  });

  it('shows the public page with the 10 latest reviews', async () => {
    const details = await service.findDetails(base.id);

    expect(repository.findLatestReviews).toHaveBeenCalledWith(base.id, 10);
    expect(details).toMatchObject({
      id: base.id,
      latestReviews: [{ id: 'r1', authorName: 'Ana', rating: 5 }],
    });
  });

  describe('photos', () => {
    const photo = {
      buffer: Buffer.from('x'),
      mimetype: 'image/jpeg',
      size: 1,
    } as never;

    it('replaces the photo once moderation allows the change', async () => {
      moderation.assertCanChange.mockResolvedValue({
        status: 'PENDING',
        rejectionReason: null,
      });
      repository.findById.mockResolvedValue(
        entity({ photoUrl: 'https://cdn.example.com/old.jpg' }),
      );

      await service.updatePhoto(base.id, photo, ana);

      expect(photos.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'destinations',
          ownerId: base.id,
          previousUrl: 'https://cdn.example.com/old.jpg',
        }),
      );
      expect(repository.update).toHaveBeenCalledWith(base.id, {
        photoUrl: 'https://cdn.example.com/new.jpg',
        status: 'PENDING',
        rejectionReason: null,
      });
    });

    it('uploads nothing when moderation refuses', async () => {
      moderation.assertCanChange.mockRejectedValue(new Error('403'));

      await expect(service.updatePhoto(base.id, photo, ana)).rejects.toThrow(
        '403',
      );
      expect(photos.replace).not.toHaveBeenCalled();
    });

    it('deletes the stored photo with the entry', async () => {
      repository.findById.mockResolvedValue(
        entity({ photoUrl: 'https://cdn.example.com/old.jpg' }),
      );

      await service.remove(base.id, ana);

      expect(photos.discard).toHaveBeenCalledWith(
        'https://cdn.example.com/old.jpg',
      );
    });
  });
});
