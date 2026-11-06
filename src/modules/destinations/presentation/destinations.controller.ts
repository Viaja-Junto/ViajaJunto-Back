import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
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
import { StrictRateLimit } from '../../../shared/http/throttling.js';
import type { UploadedPhoto } from '../../../shared/storage/domain/photo.js';
import { ApiPhotoUpload } from '../../../shared/storage/http/api-photo-upload.decorator.js';
import { photoFilePipe } from '../../../shared/storage/http/photo-file.pipe.js';
import { PhotoUploadInterceptor } from '../../../shared/storage/http/photo-upload.interceptor.js';
import {
  ModerationQueryDto,
  MySubmissionsQueryDto,
  RejectSubmissionDto,
} from '../../../shared/http/dto/moderation.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard.js';
import { CreateDestinationDto } from '../application/dto/create-destination.dto.js';
import { DestinationDetailsResponseDto } from '../application/dto/destination-details-response.dto.js';
import { DestinationResponseDto } from '../application/dto/destination-response.dto.js';
import { ListDestinationsQueryDto } from '../application/dto/list-destinations-query.dto.js';
import { TopDestinationsQueryDto } from '../application/dto/top-destinations-query.dto.js';
import { UpdateDestinationDto } from '../application/dto/update-destination.dto.js';
import { DestinationsService } from '../application/destinations.service.js';

const DUPLICATE =
  'A destination with this name already exists in this country.';
const LOCKED =
  'An approved destination can only be changed by an administrator, and a suggestion only by its author.';

@ApiTags('Destinations')
@Controller('destinations')
export class DestinationsController {
  constructor(private readonly service: DestinationsService) {}

  @ApiOperation({
    summary: 'Browse destinations',
    description:
      'Paginated, alphabetical list of the published destinations (cities or regions). Narrow it with `q` (name), `country` (name or ISO code) and `category`. Public.',
  })
  @ApiPaginatedResponse(DestinationResponseDto, 'Page of destinations.')
  @ApiUnprocessableEntityResponse({
    description: 'Invalid filters or pagination parameters.',
    type: ValidationErrorResponseDto,
  })
  @Get()
  findAll(@Query() query: ListDestinationsQueryDto) {
    return this.service.findAll(query);
  }

  @ApiOperation({
    summary: 'Top rated destinations',
    description:
      'The best rated destinations, best first, for the home page (FR25). Destinations without reviews are not listed. Public.',
  })
  @ApiOkResponse({
    description: 'Best rated destinations.',
    type: [DestinationResponseDto],
  })
  @ApiUnprocessableEntityResponse({
    description: 'Invalid limit.',
    type: ValidationErrorResponseDto,
  })
  @Get('top')
  findTop(@Query() query: TopDestinationsQueryDto) {
    return this.service.findTop(query.limit);
  }

  @ApiOperation({
    summary: 'My suggested destinations',
    description:
      'The destinations the caller suggested, in any state, with the reason when one was rejected.',
  })
  @ApiPaginatedResponse(
    DestinationResponseDto,
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
    summary: 'Destinations to review',
    description:
      'The administrators’ queue: destinations in the given state, PENDING by default. Administrators only.',
  })
  @ApiPaginatedResponse(
    DestinationResponseDto,
    'Page of destinations to review.',
  )
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
    summary: 'Public page of a destination',
    description:
      'A published destination with its rating, review count and the 10 latest reviews (newest first, author name only). Public.',
  })
  @ApiIdParam('Destination identifier.')
  @ApiOkResponse({
    description: 'The destination and its latest reviews.',
    type: DestinationDetailsResponseDto,
  })
  @ApiNotFound('No published destination exists with this id.')
  @Get(':id/details')
  findDetails(@IdParam() id: string) {
    return this.service.findDetails(id);
  }

  @ApiOperation({
    summary: 'Get a destination by id',
    description: 'A published destination. Public.',
  })
  @ApiIdParam('Destination identifier.')
  @ApiOkResponse({
    description: 'The requested destination.',
    type: DestinationResponseDto,
  })
  @ApiNotFound('No published destination exists with this id.')
  @Get(':id')
  findOne(@IdParam() id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({
    summary: 'Suggest a destination',
    description:
      'Adds a city or region to the catalog. From a regular user it waits for an administrator (PENDING); from an administrator it is published at once.',
  })
  @ApiBody({ type: CreateDestinationDto })
  @ApiCreatedResponse({
    description: 'The suggested destination.',
    type: DestinationResponseDto,
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
    @Body() dto: CreateDestinationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }

  @ApiOperation({
    summary: 'Update a destination',
    description:
      'The author changes their suggestion while it is not approved (fixing a rejected one sends it back to review); an administrator changes any destination.',
  })
  @ApiIdParam('Destination identifier.')
  @ApiBody({ type: UpdateDestinationDto })
  @ApiOkResponse({
    description: 'The updated destination.',
    type: DestinationResponseDto,
  })
  @ApiNotFound('No destination exists with this id.')
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
    @Body() dto: UpdateDestinationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @ApiOperation({
    summary: 'Approve a destination',
    description: 'Publishes it and tells its author. Administrators only.',
  })
  @ApiModerationDecision('Destination', DestinationResponseDto)
  @Patch(':id/approve')
  approve(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.approve(id, user);
  }

  @ApiOperation({
    summary: 'Reject a destination',
    description:
      'Takes it out of (or keeps it off) the public catalog and tells its author why. Administrators only.',
  })
  @ApiModerationDecision('Destination', DestinationResponseDto, true)
  @Patch(':id/reject')
  reject(
    @IdParam() id: string,
    @Body() dto: RejectSubmissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.reject(id, dto.reason, user);
  }

  @ApiOperation({
    summary: 'Delete a destination',
    description:
      'The author deletes their suggestion while it is not approved; an administrator deletes any destination. Its tourist spots stay, without a destination.',
  })
  @ApiIdParam('Destination identifier.')
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiNotFound('No destination exists with this id.')
  @ApiForbidden(LOCKED)
  @ApiConflict('A trip still has this destination as a stop.')
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user);
  }

  @ApiOperation({
    summary: 'Upload the destination photo',
    description:
      'Stores the image in object storage (S3) and sets `photoUrl` to its public URL, deleting the previous photo. Same permission as editing: the author while it is not approved, an administrator always.',
  })
  @ApiPhotoUpload('Destination')
  @ApiOkResponse({
    description: 'The destination with its new `photoUrl`.',
    type: DestinationResponseDto,
  })
  @ApiForbidden(LOCKED)
  @UseGuards(JwtAuthGuard)
  @Put(':id/photo')
  @StrictRateLimit()
  @UseInterceptors(PhotoUploadInterceptor)
  updatePhoto(
    @IdParam() id: string,
    @UploadedFile(photoFilePipe) file: UploadedPhoto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updatePhoto(id, file, user);
  }
}
