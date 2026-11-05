import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserResponseDto } from '../../users/application/dto/user-response.dto.js';
import { UsersService } from '../../users/application/users.service.js';
import { UserRepository } from '../../users/domain/user.repository.js';
import { AccessTokenIssuer } from '../domain/access-token.issuer.js';
import { PasswordHasher } from '../domain/password-hasher.js';
import { AccessTokenResponseDto } from './dto/access-token-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

const INVALID_CREDENTIALS = 'Invalid email or password';

@Injectable()
export class AuthService {
  /** Verified against when the email is unknown, so both paths take as long. */
  private decoyHash?: Promise<string>;

  constructor(
    private readonly users: UserRepository,
    private readonly profiles: UsersService,
    private readonly hasher: PasswordHasher,
    private readonly tokens: AccessTokenIssuer,
  ) {}

  async register(dto: RegisterDto): Promise<AccessTokenResponseDto> {
    if (await this.users.findCredentialsByEmail(dto.email)) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash: await this.hasher.hash(dto.password),
    });

    return AccessTokenResponseDto.from(await this.tokens.issue(user));
  }

  /** The same 401 for an unknown email and a wrong password, so neither reveals which accounts exist. */
  async login(dto: LoginDto): Promise<AccessTokenResponseDto> {
    const user = await this.users.findCredentialsByEmail(dto.email);
    const valid = await this.hasher.verify(
      dto.password,
      user?.passwordHash ?? (await this.decoy()),
    );

    if (!user || !valid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return AccessTokenResponseDto.from(
      await this.tokens.issue({ id: user.id, email: user.email }),
    );
  }

  getProfile(userId: string): Promise<UserResponseDto> {
    return this.profiles.getProfile(userId);
  }

  private decoy(): Promise<string> {
    this.decoyHash ??= this.hasher.hash('decoy-password-never-matches');

    return this.decoyHash;
  }
}
