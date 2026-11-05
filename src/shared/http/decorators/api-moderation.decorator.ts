import { applyDecorators, UseGuards, type Type } from '@nestjs/common';
import { ApiBody, ApiConflictResponse, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../modules/auth/presentation/guards/jwt-auth.guard.js';
import { ErrorResponseDto } from '../dto/error-response.dto.js';
import { RejectSubmissionDto } from '../dto/moderation.dto.js';
import {
  ApiAuthenticated,
  ApiForbidden,
} from './api-auth-responses.decorator.js';
import { ApiIdParam, ApiNotFound } from './api-resource-responses.decorator.js';

/** Documents and guards an administrator's approve/reject decision on a catalog entry. */
export const ApiModerationDecision = (
  entity: string,
  ok: Type<unknown>,
  rejecting = false,
) =>
  applyDecorators(
    ApiIdParam(`${entity} identifier.`),
    ...(rejecting ? [ApiBody({ type: RejectSubmissionDto })] : []),
    ApiOkResponse({
      description: `The ${entity.toLowerCase()} with its new status.`,
      type: ok,
    }),
    ApiNotFound(`No ${entity.toLowerCase()} exists with this id.`),
    ApiForbidden('Only an administrator can do this.'),
    ApiConflictResponse({
      description: `The ${entity.toLowerCase()} already has this status.`,
      type: ErrorResponseDto,
    }),
    ApiAuthenticated(),
    UseGuards(JwtAuthGuard),
  );
