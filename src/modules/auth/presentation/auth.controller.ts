import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiAuthenticated } from '../../../shared/http/decorators/api-auth-responses.decorator.js';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../../shared/http/dto/error-response.dto.js';
import { StrictRateLimit } from '../../../shared/http/throttling.js';
import { UserResponseDto } from '../../users/application/dto/user-response.dto.js';
import { AuthService } from '../application/auth.service.js';
import { AccessTokenResponseDto } from '../application/dto/access-token-response.dto.js';
import { LoginDto } from '../application/dto/login.dto.js';
import { RegisterDto } from '../application/dto/register.dto.js';
import type { AuthenticatedUser } from '../domain/authenticated-user.entity.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @ApiOperation({
    summary: 'Create an account',
    description:
      'Registers a traveller with name, email and password and signs them in right away. Public.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'The account was created; here is its access token.',
    type: AccessTokenResponseDto,
  })
  @ApiConflictResponse({
    description: 'An account with this email already exists.',
    type: ErrorResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @Post('register')
  @StrictRateLimit()
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.service.register(dto);
  }

  @ApiOperation({
    summary: 'Sign in',
    description:
      'Exchanges email and password for an access token. A wrong password and an unknown email get the same answer. Public.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Signed in; here is the access token.',
    type: AccessTokenResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password.',
    type: ErrorResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @Post('login')
  @StrictRateLimit()
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  @ApiOperation({
    summary: 'Current user',
    description:
      'Returns the profile of the user who owns the access token. Signing out is done by discarding the token on the client.',
  })
  @ApiOkResponse({
    description: 'The authenticated user.',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'The account behind the token has been deleted.',
    type: ErrorResponseDto,
  })
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getProfile(user.id);
  }
}
