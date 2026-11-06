import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto.js';

export const ApiIdParam = (
  description: string,
  example = '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
) =>
  applyDecorators(
    ApiParam({
      name: 'id',
      description,
      format: 'uuid',
      example,
    }),
    ApiBadRequestResponse({
      description: 'The id in the path is not a valid UUID.',
      type: ErrorResponseDto,
    }),
  );

export const ApiNotFound = (description: string) =>
  ApiNotFoundResponse({ description, type: ErrorResponseDto });

export const ApiConflict = (description: string) =>
  ApiConflictResponse({ description, type: ErrorResponseDto });
