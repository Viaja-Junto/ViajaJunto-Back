import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsersService } from '../application/users.service.js';
import { UsersController } from './users.controller.js';

describe('UsersController', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const caller = { id, email: 'ana@example.com' };

  let service: Record<
    'findAll' | 'getProfile' | 'update' | 'remove',
    ReturnType<typeof vi.fn>
  >;
  let controller: UsersController;

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      getProfile: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    controller = new UsersController(service as unknown as UsersService);
  });

  it('passes the query on findAll', () => {
    controller.findAll({ q: 'ana' });

    expect(service.findAll).toHaveBeenCalledWith({ q: 'ana' });
  });

  it('reads one account', () => {
    controller.findOne(id);

    expect(service.getProfile).toHaveBeenCalledWith(id);
  });

  it('forwards id, body and caller on update', () => {
    controller.update(id, { name: 'Ana' }, caller);

    expect(service.update).toHaveBeenCalledWith(id, { name: 'Ana' }, caller);
  });

  it('forwards id and caller on remove', () => {
    controller.remove(id, caller);

    expect(service.remove).toHaveBeenCalledWith(id, caller);
  });
});
