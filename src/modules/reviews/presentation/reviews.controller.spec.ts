import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReviewsService } from '../application/reviews.service.js';
import { ReviewsController } from './reviews.controller.js';

describe('ReviewsController', () => {
  const id = '99999999-9999-4999-8999-999999999999';
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ana@example.com',
  };

  let service: Record<keyof ReviewsService, ReturnType<typeof vi.fn>>;
  let controller: ReviewsController;

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    controller = new ReviewsController(service as unknown as ReviewsService);
  });

  it('passes the query straight through on findAll', () => {
    controller.findAll({ page: 2, limit: 10 });

    expect(service.findAll).toHaveBeenCalledWith({ page: 2, limit: 10 });
  });

  it('forwards the id on findOne', () => {
    controller.findOne(id);

    expect(service.findOne).toHaveBeenCalledWith(id);
  });

  it('forwards body and author on create', () => {
    const dto = {
      touristSpotId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      rating: 5,
    };

    controller.create(dto, user);

    expect(service.create).toHaveBeenCalledWith(dto, user);
  });

  it('forwards id, body and author on update', () => {
    controller.update(id, { rating: 4 }, user);

    expect(service.update).toHaveBeenCalledWith(id, { rating: 4 }, user);
  });

  it('forwards id and author on remove', () => {
    controller.remove(id, user);

    expect(service.remove).toHaveBeenCalledWith(id, user);
  });
});
