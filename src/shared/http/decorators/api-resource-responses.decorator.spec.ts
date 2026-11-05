import { Controller, Get } from '@nestjs/common';
import { DECORATORS } from '@nestjs/swagger';
import { describe, expect, it } from 'vitest';
import { ErrorResponseDto } from '../dto/error-response.dto.js';
import {
  ApiConflict,
  ApiIdParam,
  ApiNotFound,
} from './api-resource-responses.decorator.js';
import { IdParam } from './id-param.decorator.js';

@Controller('samples')
class SampleController {
  @ApiIdParam('Sample identifier.')
  @ApiNotFound('No sample exists with this id.')
  @ApiConflict('The sample is still in use.')
  @Get(':id')
  findOne(@IdParam() id: string) {
    return id;
  }
}

const responses = () =>
  Reflect.getMetadata(
    DECORATORS.API_RESPONSE,
    SampleController.prototype.findOne,
  ) as Record<string, { description: string; type: unknown }>;

describe('resource response decorators', () => {
  it('documents the uuid path parameter', () => {
    const [param] = Reflect.getMetadata(
      DECORATORS.API_PARAMETERS,
      SampleController.prototype.findOne,
    ) as { name: string; format: string }[];

    expect(param).toMatchObject({ name: 'id', format: 'uuid' });
  });

  it('documents 400, 404 and 409 with the shared error shape', () => {
    expect(responses()).toMatchObject({
      '400': { type: ErrorResponseDto },
      '404': {
        description: 'No sample exists with this id.',
        type: ErrorResponseDto,
      },
      '409': {
        description: 'The sample is still in use.',
        type: ErrorResponseDto,
      },
    });
  });
});
