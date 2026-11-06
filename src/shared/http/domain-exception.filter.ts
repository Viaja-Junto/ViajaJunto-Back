import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  InvalidInputError,
  NotFoundError,
  UnauthorizedError,
  UnavailableError,
} from '@shared/domain/errors.js';
import { errorBody } from './error-body.js';

const STATUS_BY_ERROR = new Map<Function, HttpStatus>([
  [NotFoundError, HttpStatus.NOT_FOUND],
  [ForbiddenError, HttpStatus.FORBIDDEN],
  [ConflictError, HttpStatus.CONFLICT],
  [InvalidInputError, HttpStatus.UNPROCESSABLE_ENTITY],
  [UnauthorizedError, HttpStatus.UNAUTHORIZED],
  [UnavailableError, HttpStatus.SERVICE_UNAVAILABLE],
]);

export function statusOf(error: DomainError): HttpStatus {
  return STATUS_BY_ERROR.get(error.constructor) ?? HttpStatus.BAD_REQUEST;
}

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost) {
    const status = statusOf(error);

    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json(errorBody(status, error.detail));
  }
}
