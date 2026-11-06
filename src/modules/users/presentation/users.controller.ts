import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
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
import { ListUsersQueryDto } from '../application/dto/list-users-query.dto.js';
import { UpdateUserDto } from '../application/dto/update-user.dto.js';
import { UserResponseDto } from '../application/dto/user-response.dto.js';
import { UsersService } from '../application/users.service.js';

@ApiTags('Users')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @ApiOperation({
    summary: 'Browse users',
    description:
      'Paginated list of accounts, newest first. Narrow it with `q` (name or email) to find someone to invite to a trip.',
  })
  @ApiPaginatedResponse(UserResponseDto, 'Page of users.')
  @ApiUnprocessableEntityResponse({
    description: 'Invalid filters or pagination parameters.',
    type: ValidationErrorResponseDto,
  })
  @ApiAuthenticated()
  @Get()
  findAll(@Query() query: ListUsersQueryDto) {
    return this.service.findAll(query);
  }

  @ApiOperation({
    summary: 'Get a user by id',
    description: 'Returns a single account.',
  })
  @ApiIdParam('User identifier.')
  @ApiOkResponse({ description: 'The requested user.', type: UserResponseDto })
  @ApiNotFound('No user exists with this id.')
  @ApiAuthenticated()
  @Get(':id')
  findOne(@IdParam() id: string) {
    return this.service.getProfile(id);
  }

  @ApiOperation({
    summary: 'Update your account',
    description:
      'Changes the name or the email of the caller’s own account. The role is never changed through the API.',
  })
  @ApiIdParam('User identifier; must be the caller.')
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ description: 'The updated user.', type: UserResponseDto })
  @ApiNotFound('No user exists with this id.')
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbidden('The id is not the caller’s own account.')
  @ApiConflict('Another account already uses this email.')
  @ApiAuthenticated()
  @Patch(':id')
  update(
    @IdParam() id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, caller);
  }

  @ApiOperation({
    summary: 'Delete your account',
    description:
      'Permanently deletes the caller’s account with its reviews; the ratings those reviews fed are recalculated. The destinations and tourist spots it suggested stay in the catalogs.',
  })
  @ApiIdParam('User identifier; must be the caller.')
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiNotFound('No user exists with this id.')
  @ApiForbidden('The id is not the caller’s own account.')
  @ApiAuthenticated()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@IdParam() id: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.remove(id, caller);
  }
}
