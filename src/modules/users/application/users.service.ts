import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  buildPaginationMeta,
  type PaginatedResponseDto,
} from '../../../shared/http/dto/paginated-response.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import type { User, UserRole } from '../domain/user.entity.js';
import { UserRepository, type UserSession } from '../domain/user.repository.js';
import { groupVisitedCountries } from '../domain/visited-countries.js';
import type { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import type { VisitedCountryResponseDto } from './dto/visited-country-response.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UserRepository) {}

  async findAll(
    query: ListUsersQueryDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      { text: query.q },
    );

    return {
      data: items.map((item) => UserResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getProfile(id: string): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.getOrFail(id));
  }

  /** The countries of the user's completed trips, for the map (FR11). */
  async findVisitedCountries(
    userId: string,
  ): Promise<VisitedCountryResponseDto[]> {
    return groupVisitedCountries(
      await this.repository.findVisitedPlaces(userId),
    );
  }

  /** Whether the account still exists and since when its tokens count; null once it is gone. */
  getSession(id: string): Promise<UserSession | null> {
    return this.repository.findSession(id);
  }

  /** A deleted account counts as a plain USER. */
  async getRole(id: string): Promise<UserRole> {
    return (await this.repository.findById(id))?.role ?? 'USER';
  }

  /**
   * Signs the account out everywhere. Rounded up to the next whole second
   * because a token's `iat` has no fraction: a token issued in the same second
   * as the sign-out would otherwise survive it.
   */
  async revokeTokens(id: string): Promise<void> {
    await this.repository.revokeTokens(
      id,
      new Date(Math.ceil(Date.now() / 1000) * 1000),
    );
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    caller: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    this.assertSelf(id, caller);
    await this.getOrFail(id);

    return UserResponseDto.from(
      await this.repository.update(id, { name: dto.name, email: dto.email }),
    );
  }

  async remove(id: string, caller: AuthenticatedUser): Promise<void> {
    this.assertSelf(id, caller);
    await this.getOrFail(id);
    await this.repository.remove(id);
  }

  private assertSelf(id: string, caller: AuthenticatedUser): void {
    if (id !== caller.id) {
      throw new ForbiddenException('You can only change your own account');
    }
  }

  private async getOrFail(id: string): Promise<User> {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return found;
  }
}
