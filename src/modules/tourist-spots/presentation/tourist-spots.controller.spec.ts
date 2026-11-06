import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TouristSpotsService } from '../application/tourist-spots.service.js';
import { TouristSpotsController } from './tourist-spots.controller.js';

/** The controller only hands the request to the service; the behaviour is covered by its spec. */
describe('TouristSpotsController', () => {
  const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ana@example.com',
  };

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
    | 'remove'
    | 'updatePhoto',
    ReturnType<typeof vi.fn>
  >;
  let controller: TouristSpotsController;

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
      updatePhoto: vi.fn(),
    };
    controller = new TouristSpotsController(
      service as unknown as TouristSpotsService,
    );
  });

  it('passes the query straight through on findAll', () => {
    const query = { page: 2, limit: 10, city: 'Porto Alegre' };

    controller.findAll(query);

    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('passes the limit on findTop', () => {
    controller.findTop({ limit: 5 });

    expect(service.findTop).toHaveBeenCalledWith(5);
  });

  it('forwards the id on findOne', () => {
    controller.findOne(id);

    expect(service.findOne).toHaveBeenCalledWith(id);
  });

  it('forwards body and caller on create', () => {
    const dto = { name: 'Usina', city: 'Porto Alegre', country: 'Brasil' };

    controller.create(dto, user);

    expect(service.create).toHaveBeenCalledWith(dto, user);
  });

  it('forwards id, body and caller on update', () => {
    controller.update(id, { name: 'Gasômetro' }, user);

    expect(service.update).toHaveBeenCalledWith(
      id,
      { name: 'Gasômetro' },
      user,
    );
  });

  it('forwards id and caller on remove', () => {
    controller.remove(id, user);

    expect(service.remove).toHaveBeenCalledWith(id, user);
  });

  it('forwards the caller’s suggestions and the review queue', () => {
    controller.findMine({ status: 'REJECTED' }, user);
    controller.findForModeration({}, user);

    expect(service.findMine).toHaveBeenCalledWith({ status: 'REJECTED' }, user);
    expect(service.findForModeration).toHaveBeenCalledWith({}, user);
  });

  it('forwards the moderation decisions', () => {
    controller.approve(id, user);
    controller.reject(id, { reason: 'Duplicado' }, user);

    expect(service.approve).toHaveBeenCalledWith(id, user);
    expect(service.reject).toHaveBeenCalledWith(id, 'Duplicado', user);
  });

  it('forwards the id on the public page', () => {
    controller.findDetails(id);

    expect(service.findDetails).toHaveBeenCalledWith(id);
  });

  it('forwards the uploaded photo', () => {
    const file = {
      buffer: Buffer.from('x'),
      mimetype: 'image/png',
      size: 1,
    } as never;

    controller.updatePhoto(id, file, user);

    expect(service.updatePhoto).toHaveBeenCalledWith(id, file, user);
  });
});
