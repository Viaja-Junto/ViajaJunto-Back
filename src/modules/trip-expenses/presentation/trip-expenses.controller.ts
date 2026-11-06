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
import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';
import {
  ApiAuthenticated,
  ApiForbidden,
} from '@shared/http/decorators/api-auth-responses.decorator.js';
import { ApiPaginatedResponse } from '@shared/http/decorators/api-paginated-response.decorator.js';
import {
  ApiIdParam,
  ApiNotFound,
} from '@shared/http/decorators/api-resource-responses.decorator.js';
import { IdParam } from '@shared/http/decorators/id-param.decorator.js';
import { ValidationErrorResponseDto } from '@shared/http/dto/error-response.dto.js';
import { CurrentUser } from '@modules/auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '@modules/auth/presentation/guards/jwt-auth.guard.js';
import { CreateTripExpenseDto } from '../application/dto/create-trip-expense.dto.js';
import { ListTripExpensesQueryDto } from '../application/dto/list-trip-expenses-query.dto.js';
import { TripExpenseResponseDto } from '../application/dto/trip-expense-response.dto.js';
import { UpdateTripExpenseDto } from '../application/dto/update-trip-expense.dto.js';
import { TripExpensesService } from '../application/trip-expenses.service.js';

const NO_TRIP =
  'No trip or expense exists with this id, or the caller has no access to it.';
const READ_ONLY = 'Viewers have read-only access to the trip.';
const INVALID = {
  description:
    'Invalid body, a payer or person outside the trip, or EXACT shares that do not add up to the amount.',
  type: ValidationErrorResponseDto,
};

@ApiTags('Trip Expenses')
@UseGuards(JwtAuthGuard)
@Controller('trip-expenses')
export class TripExpensesController {
  constructor(private readonly service: TripExpensesService) {}

  @ApiOperation({
    summary: 'List the expenses of a trip',
    description:
      'What was actually spent on the trip, newest first. Any member can read it.',
  })
  @ApiPaginatedResponse(TripExpenseResponseDto, 'Page of expenses.')
  @ApiUnprocessableEntityResponse({
    description: 'Missing or invalid tripId or pagination.',
    type: ValidationErrorResponseDto,
  })
  @ApiNotFound(NO_TRIP)
  @ApiAuthenticated()
  @Get()
  findAll(
    @Query() query: ListTripExpensesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findAll(query, user);
  }

  @ApiOperation({
    summary: 'Get an expense by id',
    description:
      'The expense with what each person owes. Any member can read it.',
  })
  @ApiIdParam('Expense identifier.')
  @ApiOkResponse({ type: TripExpenseResponseDto })
  @ApiNotFound(NO_TRIP)
  @ApiAuthenticated()
  @Get(':id')
  findOne(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  @ApiOperation({
    summary: 'Record an expense',
    description:
      'Who paid, how much and how it is split between the people of the trip. The creator and editors can record; the other members are notified.',
  })
  @ApiBody({ type: CreateTripExpenseDto })
  @ApiCreatedResponse({ type: TripExpenseResponseDto })
  @ApiUnprocessableEntityResponse(INVALID)
  @ApiForbidden(READ_ONLY)
  @ApiNotFound(NO_TRIP)
  @ApiAuthenticated()
  @Post()
  create(
    @Body() dto: CreateTripExpenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }

  @ApiOperation({
    summary: 'Change an expense',
    description:
      'The split is recalculated. Changing the amount of an EXACT split requires new `shares`.',
  })
  @ApiIdParam('Expense identifier.')
  @ApiBody({ type: UpdateTripExpenseDto })
  @ApiOkResponse({ type: TripExpenseResponseDto })
  @ApiUnprocessableEntityResponse(INVALID)
  @ApiForbidden(READ_ONLY)
  @ApiNotFound(NO_TRIP)
  @ApiAuthenticated()
  @Patch(':id')
  update(
    @IdParam() id: string,
    @Body() dto: UpdateTripExpenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @ApiOperation({
    summary: 'Delete an expense',
    description:
      'The creator and editors can delete; the balance is recalculated.',
  })
  @ApiIdParam('Expense identifier.')
  @ApiNoContentResponse({ description: 'Deleted.' })
  @ApiForbidden(READ_ONLY)
  @ApiNotFound(NO_TRIP)
  @ApiAuthenticated()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user);
  }
}
