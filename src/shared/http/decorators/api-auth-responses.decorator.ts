import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto.js';

export const ApiAuthenticated = () =>
  applyDecorators(
    ApiBearerAuth('bearer'),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid access token.',
      type: ErrorResponseDto,
    }),
  );

export const ApiForbidden = (description: string) =>
  ApiForbiddenResponse({ description, type: ErrorResponseDto });
