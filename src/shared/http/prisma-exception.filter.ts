import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { errorBody } from './error-body.js';

interface MappedError {
  status: HttpStatus;
  message: string;
}

export function mapPrismaError(
  code: string,
  meta: Record<string, unknown> | undefined,
  method: string,
): MappedError | null {
  switch (code) {
    case 'P2002':
      return {
        status: HttpStatus.CONFLICT,
        message: duplicateMessage(meta),
      };
    case 'P2003':
      return method === 'DELETE'
        ? {
            status: HttpStatus.CONFLICT,
            message: 'The record is still referenced by other records',
          }
        : {
            status: HttpStatus.NOT_FOUND,
            message: 'A referenced record does not exist',
          };
    case 'P2025':
      return { status: HttpStatus.NOT_FOUND, message: 'Record not found' };
    default:
      return null;
  }
}

function duplicateMessage(meta: Record<string, unknown> | undefined): string {
  const target = meta?.target;
  if (Array.isArray(target) && target.length > 0) {
    return `A record with this ${target.join(', ')} already exists`;
  }

  // Driver adapters (PrismaPg) do not report the columns, only the model.
  const model = meta?.modelName;

  return typeof model === 'string'
    ? `A ${model} with these values already exists`
    : 'A record with these values already exists';
}

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const mapped = mapPrismaError(
      exception.code,
      exception.meta,
      request.method,
    );

    if (!mapped) {
      this.logger.error(`${exception.code}: ${exception.message}`);
      response
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json(
          errorBody(HttpStatus.INTERNAL_SERVER_ERROR, 'Internal server error'),
        );
      return;
    }

    response
      .status(mapped.status)
      .json(errorBody(mapped.status, mapped.message));
  }
}
