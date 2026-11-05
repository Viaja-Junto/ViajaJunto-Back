import { HttpStatus, type ArgumentsHost } from '@nestjs/common';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  InvalidInputError,
  NotFoundError,
  UnauthorizedError,
  UnavailableError,
} from '@shared/domain/errors.js';
import { DomainExceptionFilter, statusOf } from './domain-exception.filter.js';

class UnmappedError extends DomainError {}

describe('DomainExceptionFilter', () => {
  it.each([
    [new NotFoundError('x'), HttpStatus.NOT_FOUND],
    [new ForbiddenError('x'), HttpStatus.FORBIDDEN],
    [new ConflictError('x'), HttpStatus.CONFLICT],
    [new InvalidInputError(['x']), HttpStatus.UNPROCESSABLE_ENTITY],
    [new UnauthorizedError('x'), HttpStatus.UNAUTHORIZED],
    [new UnavailableError('x'), HttpStatus.SERVICE_UNAVAILABLE],
    [new UnmappedError('x'), HttpStatus.BAD_REQUEST],
  ])('maps %s to %i', (error, status) => {
    expect(statusOf(error)).toBe(status);
  });

  it('answers with the same body shape as the Nest exceptions', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    new DomainExceptionFilter().catch(
      new InvalidInputError(['name is too short']),
      host,
    );

    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith({
      statusCode: 422,
      message: ['name is too short'],
      error: 'Unprocessable Entity',
    });
  });

  it('keeps the class name and a readable message', () => {
    const error = new NotFoundError('Trip not found');

    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('Trip not found');
  });
});
