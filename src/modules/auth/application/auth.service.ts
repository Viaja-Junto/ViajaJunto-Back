import { Injectable } from '@nestjs/common';
import { UserResponseDto } from '@modules/users/application/dto/user-response.dto.js';
import { UsersService } from '@modules/users/application/users.service.js';
import { UserRepository } from '@modules/users/domain/user.repository.js';
import { AccessTokenIssuer } from '../domain/access-token.issuer.js';
import type { GoogleIdentity } from '@modules/users/domain/google-identity.entity.js';
import { PasswordHasher } from '../domain/password-hasher.js';
import { AccessTokenResponseDto } from './dto/access-token-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { ConflictError, UnauthorizedError } from '@shared/domain/errors.js';

const INVALID_CREDENTIALS = 'Invalid email or password';

@Injectable()
export class AuthService {
  // Checked when the email is unknown, so both paths take as long.
  private decoyHash?: Promise<string>;

  constructor(
    private readonly users: UserRepository,
    private readonly profiles: UsersService,
    private readonly hasher: PasswordHasher,
    private readonly tokens: AccessTokenIssuer,
  ) {}

  async register(dto: RegisterDto): Promise<AccessTokenResponseDto> {
    if (await this.users.findCredentialsByEmail(dto.email)) {
      throw new ConflictError('An account with this email already exists');
    }

    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash: await this.hasher.hash(dto.password),
    });

    return AccessTokenResponseDto.from(await this.tokens.issue(user));
  }

  // One 401 for every failure, so the answer never reveals which accounts exist.
  async login(dto: LoginDto): Promise<AccessTokenResponseDto> {
    const user = await this.users.findCredentialsByEmail(dto.email);
    const valid = await this.hasher.verify(
      dto.password,
      user?.passwordHash ?? (await this.decoy()),
    );

    if (!user || !valid) {
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    return AccessTokenResponseDto.from(
      await this.tokens.issue({ id: user.id, email: user.email }),
    );
  }

  async signInWithGoogle(
    identity: GoogleIdentity,
  ): Promise<AccessTokenResponseDto> {
    const user = await this.profiles.findOrCreateFromGoogle(identity);

    return AccessTokenResponseDto.from(
      await this.tokens.issue({ id: user.id, email: user.email }),
    );
  }

  getProfile(userId: string): Promise<UserResponseDto> {
    return this.profiles.getProfile(userId);
  }

  signOut(userId: string): Promise<void> {
    return this.profiles.revokeTokens(userId);
  }

  private decoy(): Promise<string> {
    this.decoyHash ??= this.hasher.hash('decoy-password-never-matches');

    return this.decoyHash;
  }
}
