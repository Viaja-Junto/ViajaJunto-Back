import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiFoundResponse,
  ApiServiceUnavailableResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { env } from '@shared/config/env.js';
import { ApiAuthenticated } from '@shared/http/decorators/api-auth-responses.decorator.js';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '@shared/http/dto/error-response.dto.js';
import { StrictRateLimit } from '@shared/http/throttling.js';
import { UserResponseDto } from '@modules/users/application/dto/user-response.dto.js';
import { AuthService } from '../application/auth.service.js';
import { AccessTokenResponseDto } from '../application/dto/access-token-response.dto.js';
import { LoginDto } from '../application/dto/login.dto.js';
import { RegisterDto } from '../application/dto/register.dto.js';
import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';
import type { GoogleIdentity } from '@modules/users/domain/google-identity.entity.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { GoogleAuthGuard } from './guards/google-auth.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

/** Error code the frontend receives when the Google sign-in did not complete. */
const GOOGLE_SIGN_IN_FAILED = 'google_sign_in_failed';

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
    summary: 'Sign in with Google',
    description:
      'Browser entry point: redirects to the Google consent screen. Open it with a full page navigation, not with fetch/XHR. The account is created on the first sign-in, or linked by email to an existing one. Answers 503 when Google sign-in is not configured on the server.',
  })
  @ApiFoundResponse({ description: 'Redirect to the Google consent screen.' })
  @ApiServiceUnavailableResponse({
    description: 'Google sign-in is not configured on this server.',
    type: ErrorResponseDto,
  })
  @Get('google')
  @StrictRateLimit()
  @UseGuards(GoogleAuthGuard)
  googleSignIn(): void {
    // GoogleAuthGuard answers with the redirect; this body never runs.
  }

  @ApiOperation({
    summary: 'Google sign-in callback',
    description:
      'Called by Google, not by clients. Redirects to the frontend (AUTH_REDIRECT_URL) with `#access_token=<jwt>&token_type=Bearer&expires_in=<seconds>`, or with `#error=google_sign_in_failed` when consent was denied or the request could not be verified.',
  })
  @ApiFoundResponse({
    description: 'Redirect to the frontend with the token or an error.',
  })
  @ApiServiceUnavailableResponse({
    description: 'Google sign-in is not configured on this server.',
    type: ErrorResponseDto,
  })
  @Get('google/callback')
  @StrictRateLimit()
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const identity = request.user as GoogleIdentity | null | undefined;

    if (!identity) {
      response.redirect(frontendRedirect({ error: GOOGLE_SIGN_IN_FAILED }));
      return;
    }

    const token = await this.service.signInWithGoogle(identity);

    response.redirect(
      frontendRedirect({
        access_token: token.accessToken,
        token_type: token.tokenType,
        expires_in: String(token.expiresIn),
      }),
    );
  }

  @ApiOperation({
    summary: 'Current user',
    description:
      'Returns the profile of the user who owns the access token, with its role.',
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

  @ApiOperation({
    summary: 'Sign out',
    description:
      'Ends **every** session of the caller: all the access tokens issued so far stop working, on every device. Signing in again issues a new one.',
  })
  @ApiNoContentResponse({ description: 'Signed out. No content returned.' })
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.service.signOut(user.id);
  }
}

/**
 * The frontend page the browser lands on after the Google callback. The
 * parameters travel in the URL fragment, which browsers never send to a
 * server, so the token stays out of access logs and the Referer header.
 */
function frontendRedirect(params: Record<string, string>): string {
  const url = new URL(env.AUTH_REDIRECT_URL);
  url.hash = new URLSearchParams(params).toString();
  return url.toString();
}
