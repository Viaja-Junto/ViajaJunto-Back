import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
} from '../dto/pagination-query.dto.js';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from '../dto/paginated-response.dto.js';

// OpenAPI has no generics: allOf + $ref types `data` with the given model.
export const ApiPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
  description = 'Page of results.',
) =>
  applyDecorators(
    ApiExtraModels(PaginatedResponseDto, PaginationMetaDto, model),
    ApiQuery({
      name: 'page',
      required: false,
      schema: { type: 'integer', minimum: 1, default: DEFAULT_PAGE },
      description: 'Page number, starting at 1.',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      schema: {
        type: 'integer',
        minimum: 1,
        maximum: MAX_LIMIT,
        default: DEFAULT_LIMIT,
      },
      description: `Records per page (maximum ${MAX_LIMIT}).`,
      example: 20,
    }),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              data: { type: 'array', items: { $ref: getSchemaPath(model) } },
            },
          },
        ],
      },
    }),
  );
