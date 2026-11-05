import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { assertOwner } from './assert-owner.js';

describe('assertOwner', () => {
  const user = { id: 'ana', email: 'ana@example.com' };

  it('lets the owner through', () => {
    expect(() => assertOwner('ana', user, 'nope')).not.toThrow();
  });

  it('answers 403 with the given message to anyone else', () => {
    expect(() =>
      assertOwner('bia', user, 'Only the author can do this'),
    ).toThrow(new ForbiddenException('Only the author can do this'));
  });
});
