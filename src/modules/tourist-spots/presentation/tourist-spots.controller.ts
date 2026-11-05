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
import { ApiModerationDecision } from '../../../shared/http/decorators/api-moderation.decorator.js';
import { ApiPaginatedResponse } from '../../../shared/http/decorators/api-paginated-response.decorator.js';
import {
  ApiConflict,
  ApiIdParam,
  ApiNotFound,
} from '../../../shared/http/decorators/api-resource-responses.decorator.js';
import { IdParam } from '../../../shared/http/decorators/id-param.decorator.js';
import { ValidationErrorResponseDto } from '../../../shared/http/dto/error-response.dto.js';
import {
  ModerationQueryDto,
  MySubmissionsQueryDto,
  RejectSubmissionDto,
} from '../../../shared/http/dto/moderation.dto.js';
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
const LOCKED =
  'An approved spot can only be changed by an administrator, and a suggestion only by its author.';

@ApiTags('Tourist Spots')
@Controller('tourist-spots')
export class TouristSpotsController {
  constructor(private readonly service: TouristSpotsService) {}

  @ApiOperation({
    summary: 'Browse tourist spots',
    description:
      'Paginated list of the published (APPROVED) tourist spots. Narrow it with `q` (name), `city`, `country` (name or ISO code), `category`, `minRating` and `destinationId`, and order it with `sort`. Public.',
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
      'The best rated published spots, best first; ties go to the one with more reviews. Spots without reviews are not listed. Public.',
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
    summary: 'My suggested tourist spots',
    description:
      'The spots the caller suggested, in any state, with the reason when one was rejected.',
  })
  @ApiPaginatedResponse(
    TouristSpotResponseDto,
    'Page of the caller’s suggestions.',
  )
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(
    @Query() query: MySubmissionsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findMine(query, user);
  }

  @ApiOperation({
    summary: 'Tourist spots to review',
    description:
      'The administrators’ queue: spots in the given state, PENDING by default. Administrators only.',
  })
  @ApiPaginatedResponse(TouristSpotResponseDto, 'Page of spots to review.')
  @ApiForbidden('Only an administrator can do this.')
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Get('moderation')
  findForModeration(
    @Query() query: ModerationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findForModeration(query, user);
  }

  @ApiOperation({
    summary: 'Get a tourist spot by id',
    description:
      'A published tourist spot with its location and average rating. Public.',
  })
  @ApiIdParam('Tourist spot identifier.')
  @ApiOkResponse({
    description: 'The requested tourist spot.',
    type: TouristSpotResponseDto,
  })
  @ApiNotFound('No published tourist spot exists with this id.')
  @Get(':id')
  findOne(@IdParam() id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({
    summary: 'Suggest a tourist spot',
    description:
      'Adds a place to the catalog. From a regular user it waits for an administrator (PENDING); from an administrator it is published at once. `destinationId` must point at a published destination.',
  })
  @ApiBody({ type: CreateTouristSpotDto })
  @ApiCreatedResponse({
    description: 'The suggested tourist spot.',
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
      'Changes any field except the rating, which comes from the reviews. The author changes their suggestion while it is not approved (fixing a rejected one sends it back to review); an administrator changes any spot.',
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
  @ApiForbidden(LOCKED)
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
    summary: 'Approve a tourist spot',
    description: 'Publishes it and tells its author. Administrators only.',
  })
  @ApiModerationDecision('Tourist spot', TouristSpotResponseDto)
  @Patch(':id/approve')
  approve(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.approve(id, user);
  }

  @ApiOperation({
    summary: 'Reject a tourist spot',
    description:
      'Takes it out of (or keeps it off) the public catalog and tells its author why. Administrators only.',
  })
  @ApiModerationDecision('Tourist spot', TouristSpotResponseDto, true)
  @Patch(':id/reject')
  reject(
    @IdParam() id: string,
    @Body() dto: RejectSubmissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.reject(id, dto.reason, user);
  }

  @ApiOperation({
    summary: 'Delete a tourist spot',
    description:
      'Removes the spot with its reviews. The author deletes their suggestion while it is not approved; an administrator deletes any spot.',
  })
  @ApiIdParam('Tourist spot identifier.')
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiNotFound('No tourist spot exists with this id.')
  @ApiForbidden(LOCKED)
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user);
  }
}
