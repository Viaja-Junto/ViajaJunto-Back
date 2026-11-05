import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  ApiAuthenticated,
  ApiForbidden,
} from '../../../shared/http/decorators/api-auth-responses.decorator.js';
import { ApiPaginatedResponse } from '../../../shared/http/decorators/api-paginated-response.decorator.js';
import {
  ApiConflict,
  ApiIdParam,
  ApiNotFound,
} from '../../../shared/http/decorators/api-resource-responses.decorator.js';
import { IdParam } from '../../../shared/http/decorators/id-param.decorator.js';
import { ValidationErrorResponseDto } from '../../../shared/http/dto/error-response.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard.js';
import { CreateTouristSpotDto } from '../application/dto/create-tourist-spot.dto.js';
import { ListTouristSpotsQueryDto } from '../application/dto/list-tourist-spots-query.dto.js';
import { TopTouristSpotsQueryDto } from '../application/dto/top-tourist-spots-query.dto.js';
import { TouristSpotResponseDto } from '../application/dto/tourist-spot-response.dto.js';
import { UpdateTouristSpotDto } from '../application/dto/update-tourist-spot.dto.js';
import { TouristSpotsService } from '../application/tourist-spots.service.js';

const DUPLICATE = 'A tourist spot with this name already exists in this city.';

@ApiTags('Tourist Spots')
@Controller('tourist-spots')
export class TouristSpotsController {
  constructor(private readonly service: TouristSpotsService) {}

  @ApiOperation({
    summary: 'Browse tourist spots',
    description:
      'Returns a paginated list of tourist spots. Narrow it with `q` (name), `city`, `country` (name or ISO code), `category` and `minRating`, and order it with `sort`. Public.',
  })
  @ApiPaginatedResponse(TouristSpotResponseDto, 'Page of tourist spots.')
  @ApiUnprocessableEntityResponse({
    description: 'Invalid filters or pagination parameters.',
    type: ValidationErrorResponseDto,
  })
  @Get()
  findAll(@Query() query: ListTouristSpotsQueryDto) {
    return this.service.findAll(query);
  }

  @ApiOperation({
    summary: 'Top rated tourist spots',
    description:
      'The best rated spots, best first; ties go to the one with more reviews. Spots without reviews are not listed. Public.',
  })
  @ApiOkResponse({
    description: 'Best rated spots.',
    type: [TouristSpotResponseDto],
  })
  @ApiUnprocessableEntityResponse({
    description: 'Invalid limit.',
    type: ValidationErrorResponseDto,
  })
  @Get('top')
  findTop(@Query() query: TopTouristSpotsQueryDto) {
    return this.service.findTop(query.limit);
  }

  @ApiOperation({
    summary: 'Get a tourist spot by id',
    description:
      'Returns a single tourist spot with its location and average rating. Public.',
  })
  @ApiIdParam('Tourist spot identifier.')
  @ApiOkResponse({
    description: 'The requested tourist spot.',
    type: TouristSpotResponseDto,
  })
  @ApiNotFound('No tourist spot exists with this id.')
  @Get(':id')
  findOne(@IdParam() id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({
    summary: 'Register a tourist spot',
    description:
      'Adds a place for travellers to discover and review. The caller becomes its creator, the only one who can change or delete it.',
  })
  @ApiBody({ type: CreateTouristSpotDto })
  @ApiCreatedResponse({
    description: 'The registered tourist spot.',
    type: TouristSpotResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiConflict(DUPLICATE)
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateTouristSpotDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }

  @ApiOperation({
    summary: 'Update a tourist spot',
    description:
      'Changes any field of the spot except its rating, which comes from the reviews. Only its creator can do this.',
  })
  @ApiIdParam('Tourist spot identifier.')
  @ApiBody({ type: UpdateTouristSpotDto })
  @ApiOkResponse({
    description: 'The updated tourist spot.',
    type: TouristSpotResponseDto,
  })
  @ApiNotFound('No tourist spot exists with this id.')
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiConflict(DUPLICATE)
  @ApiForbidden('Only the creator of the spot can do this.')
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @IdParam() id: string,
    @Body() dto: UpdateTouristSpotDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @ApiOperation({
    summary: 'Delete a tourist spot',
    description:
      'Removes the spot together with its reviews. Only its creator can do this.',
  })
  @ApiIdParam('Tourist spot identifier.')
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiNotFound('No tourist spot exists with this id.')
  @ApiForbidden('Only the creator of the spot can do this.')
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user);
  }
}
