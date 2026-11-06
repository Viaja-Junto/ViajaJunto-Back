import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DestinationsService } from '../application/destinations.service.js';
import { DestinationsController } from './destinations.controller.js';

describe('DestinationsController', () => {
  const id = '7d1f0c2a-5b3e-4f6a-8c9d-0e1f2a3b4c5d';
  const user = { id: 'ana', email: 'ana@example.com' };

  let service: Record<
    | 'findAll'
    | 'findTop'
    | 'findMine'
    | 'findForModeration'
    | 'findOne'
    | 'findDetails'
    | 'create'
    | 'update'
    | 'approve'
    | 'reject'
    | 'remove',
    ReturnType<typeof vi.fn>
  >;
  let controller: DestinationsController;

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      findTop: vi.fn(),
      findMine: vi.fn(),
      findForModeration: vi.fn(),
      findOne: vi.fn(),
      findDetails: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      approve: vi.fn(),
      reject: vi.fn(),
      remove: vi.fn(),
    };
    controller = new DestinationsController(
      service as unknown as DestinationsService,
    );
  });

  it('forwards the reads', () => {
    controller.findAll({ q: 'gram' });
    controller.findTop({ limit: 5 });
    controller.findMine({}, user);
    controller.findForModeration({ status: 'PENDING' }, user);
    controller.findOne(id);

    expect(service.findAll).toHaveBeenCalledWith({ q: 'gram' });
    expect(service.findTop).toHaveBeenCalledWith(5);
    expect(service.findMine).toHaveBeenCalledWith({}, user);
    expect(service.findForModeration).toHaveBeenCalledWith(
      { status: 'PENDING' },
      user,
    );
    expect(service.findOne).toHaveBeenCalledWith(id);
  });

  it('forwards the writes with the caller', () => {
    controller.create({ name: 'Gramado', country: 'Brasil' }, user);
    controller.update(id, { description: 'Serra' }, user);
    controller.approve(id, user);
    controller.reject(id, { reason: 'Duplicado' }, user);
    controller.remove(id, user);

    expect(service.create).toHaveBeenCalledWith(
      { name: 'Gramado', country: 'Brasil' },
      user,
    );
    expect(service.update).toHaveBeenCalledWith(
      id,
      { description: 'Serra' },
      user,
    );
    expect(service.approve).toHaveBeenCalledWith(id, user);
    expect(service.reject).toHaveBeenCalledWith(id, 'Duplicado', user);
    expect(service.remove).toHaveBeenCalledWith(id, user);
  });

  it('forwards the id on the public page', () => {
    controller.findDetails(id);

    expect(service.findDetails).toHaveBeenCalledWith(id);
  });
});
