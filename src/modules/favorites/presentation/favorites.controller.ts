import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';
import { ApiAuthenticated } from '@shared/http/decorators/api-auth-responses.decorator.js';
import { ApiPaginatedResponse } from '@shared/http/decorators/api-paginated-response.decorator.js';
import {
  ApiIdParam,
  ApiNotFound,
} from '@shared/http/decorators/api-resource-responses.decorator.js';
import { IdParam } from '@shared/http/decorators/id-param.decorator.js';
import { ValidationErrorResponseDto } from '@shared/http/dto/error-response.dto.js';
import { PaginationQueryDto } from '@shared/http/dto/pagination-query.dto.js';
import { CurrentUser } from '@modules/auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '@modules/auth/presentation/guards/jwt-auth.guard.js';
import { DestinationResponseDto } from '@modules/destinations/application/dto/destination-response.dto.js';
import { TouristSpotResponseDto } from '@modules/tourist-spots/application/dto/tourist-spot-response.dto.js';
import { FavoriteIdsResponseDto } from '../application/dto/favorite-ids-response.dto.js';
import { FavoritesService } from '../application/favorites.service.js';

const INVALID_PAGE = {
  description: 'Invalid pagination parameters.',
  type: ValidationErrorResponseDto,
};

@ApiTags('Favorites')
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @ApiOperation({
    summary: 'Ids of my favorites',
    description:
      'The ids of every published destination and tourist spot the caller saved, to mark them in any list.',
  })
  @ApiOkResponse({ type: FavoriteIdsResponseDto })
  @ApiAuthenticated()
  @Get('ids')
  ids(@CurrentUser() user: AuthenticatedUser) {
    return this.service.ids(user);
  }

  @ApiOperation({
    summary: 'My favorite destinations',
    description:
      'Published destinations the caller saved, most recently saved first.',
  })
  @ApiPaginatedResponse(DestinationResponseDto, 'Page of saved destinations.')
  @ApiUnprocessableEntityResponse(INVALID_PAGE)
  @ApiAuthenticated()
  @Get('destinations')
  destinations(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.listDestinations(query, user);
  }

  @ApiOperation({
    summary: 'Save a destination',
    description: 'Idempotent: saving it again changes nothing.',
  })
  @ApiIdParam('Destination identifier.')
  @ApiNoContentResponse({ description: 'Saved.' })
  @ApiNotFound('No published destination exists with this id.')
  @ApiAuthenticated()
  @Put('destinations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  addDestination(
    @IdParam() id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.add('destination', id, user);
  }

  @ApiOperation({
    summary: 'Remove a saved destination',
    description: 'Idempotent: removing one that is not saved changes nothing.',
  })
  @ApiIdParam('Destination identifier.')
  @ApiNoContentResponse({ description: 'Removed.' })
  @ApiAuthenticated()
  @Delete('destinations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDestination(
    @IdParam() id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove('destination', id, user);
  }

  @ApiOperation({
    summary: 'My favorite tourist spots',
    description:
      'Published tourist spots the caller saved, most recently saved first.',
  })
  @ApiPaginatedResponse(TouristSpotResponseDto, 'Page of saved tourist spots.')
  @ApiUnprocessableEntityResponse(INVALID_PAGE)
  @ApiAuthenticated()
  @Get('tourist-spots')
  touristSpots(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.listTouristSpots(query, user);
  }

  @ApiOperation({
    summary: 'Save a tourist spot',
    description: 'Idempotent: saving it again changes nothing.',
  })
  @ApiIdParam('Tourist spot identifier.')
  @ApiNoContentResponse({ description: 'Saved.' })
  @ApiNotFound('No published tourist spot exists with this id.')
  @ApiAuthenticated()
  @Put('tourist-spots/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  addTouristSpot(
    @IdParam() id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.add('touristSpot', id, user);
  }

  @ApiOperation({
    summary: 'Remove a saved tourist spot',
    description: 'Idempotent: removing one that is not saved changes nothing.',
  })
  @ApiIdParam('Tourist spot identifier.')
  @ApiNoContentResponse({ description: 'Removed.' })
  @ApiAuthenticated()
  @Delete('tourist-spots/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTouristSpot(
    @IdParam() id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove('touristSpot', id, user);
  }
}
