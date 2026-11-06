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
} from '@shared/http/decorators/api-auth-responses.decorator.js';
import { ApiPaginatedResponse } from '@shared/http/decorators/api-paginated-response.decorator.js';
import {
  ApiConflict,
  ApiIdParam,
  ApiNotFound,
} from '@shared/http/decorators/api-resource-responses.decorator.js';
import { IdParam } from '@shared/http/decorators/id-param.decorator.js';
import { ValidationErrorResponseDto } from '@shared/http/dto/error-response.dto.js';
import { StrictRateLimit } from '@shared/http/throttling.js';
import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';
import { CurrentUser } from '@modules/auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '@modules/auth/presentation/guards/jwt-auth.guard.js';
import { CreateReviewDto } from '../application/dto/create-review.dto.js';
import { ListReviewsQueryDto } from '../application/dto/list-reviews-query.dto.js';
import { ReviewResponseDto } from '../application/dto/review-response.dto.js';
import { UpdateReviewDto } from '../application/dto/update-review.dto.js';
import { ReviewsService } from '../application/reviews.service.js';
import { SAMPLE } from '@shared/http/openapi-samples.js';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @ApiOperation({
    summary: 'Browse reviews',
    description:
      'Returns a paginated list of reviews, newest first. Narrow it with `touristSpotId`, `userId` and `minRating`. Public.',
  })
  @ApiPaginatedResponse(ReviewResponseDto, 'Page of reviews.')
  @ApiUnprocessableEntityResponse({
    description: 'Invalid filters or pagination parameters.',
    type: ValidationErrorResponseDto,
  })
  @Get()
  findAll(@Query() query: ListReviewsQueryDto) {
    return this.service.findAll(query);
  }

  @ApiOperation({
    summary: 'Get a review by id',
    description: 'Returns a single review with its rating and comment. Public.',
  })
  @ApiIdParam('Review identifier.', SAMPLE.reviewUsina)
  @ApiOkResponse({
    description: 'The requested review.',
    type: ReviewResponseDto,
  })
  @ApiNotFound('No review exists with this id.')
  @Get(':id')
  findOne(@IdParam() id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({
    summary: 'Write a review',
    description:
      'Rates a tourist spot from 1 to 5 with an optional comment and visit day, and updates the spot average. A user reviews each spot once, and cannot review a spot they registered.',
  })
  @ApiBody({ type: CreateReviewDto })
  @ApiCreatedResponse({
    description: 'The created review.',
    type: ReviewResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description:
      'The payload failed validation, or the visit day is in the future.',
    type: ValidationErrorResponseDto,
  })
  @ApiConflict('This user has already reviewed this tourist spot.')
  @ApiNotFound('The tourist spot does not exist.')
  @ApiForbidden('The caller registered this tourist spot.')
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Post()
  @StrictRateLimit()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateReviewDto,
    @CurrentUser() author: AuthenticatedUser,
  ) {
    return this.service.create(dto, author);
  }

  @ApiOperation({
    summary: 'Update a review',
    description:
      'Edits the rating, the comment or the visit day, and updates the spot average. Only the author can do this.',
  })
  @ApiIdParam('Review identifier.', SAMPLE.reviewUsina)
  @ApiBody({
    type: UpdateReviewDto,
    examples: {
      exemplo: {
        summary: 'Muda a nota e o comentário',
        value: { rating: 4, comment: 'Lindo, mas lota no fim de semana.' },
      },
    },
  })
  @ApiOkResponse({
    description: 'The updated review.',
    type: ReviewResponseDto,
  })
  @ApiNotFound('No review exists with this id.')
  @ApiUnprocessableEntityResponse({
    description:
      'The payload failed validation, or the visit day is in the future.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbidden('Only the review author can do this.')
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @IdParam() id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() author: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, author);
  }

  @ApiOperation({
    summary: 'Delete a review',
    description:
      'Removes the review and updates the spot average. Only the author can do this.',
  })
  @ApiIdParam('Review identifier.', SAMPLE.reviewUsina)
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiNotFound('No review exists with this id.')
  @ApiForbidden('Only the review author can do this.')
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@IdParam() id: string, @CurrentUser() author: AuthenticatedUser) {
    return this.service.remove(id, author);
  }
}
