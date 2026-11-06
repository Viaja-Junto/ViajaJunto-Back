import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';
import { ApiAuthenticated } from '@shared/http/decorators/api-auth-responses.decorator.js';
import {
  ApiIdParam,
  ApiNotFound,
} from '@shared/http/decorators/api-resource-responses.decorator.js';
import { IdParam } from '@shared/http/decorators/id-param.decorator.js';
import { CurrentUser } from '@modules/auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '@modules/auth/presentation/guards/jwt-auth.guard.js';
import { ExpenseBalanceResponseDto } from '../application/dto/expense-balance-response.dto.js';
import { TripExpensesService } from '../application/trip-expenses.service.js';

@ApiTags('Trip Expenses')
@UseGuards(JwtAuthGuard)
@Controller('trips')
export class ExpenseBalanceController {
  constructor(private readonly service: TripExpensesService) {}

  @ApiOperation({
    summary: 'Who owes whom',
    description:
      'What each person paid and owes on the trip, and the fewest transfers that settle everyone. Any member can read it.',
  })
  @ApiIdParam('Trip identifier.')
  @ApiOkResponse({ type: ExpenseBalanceResponseDto })
  @ApiNotFound(
    'No trip exists with this id, or the caller has no access to it.',
  )
  @ApiAuthenticated()
  @Get(':id/expenses/balance')
  balance(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.balance(id, user);
  }
}
