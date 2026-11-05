import type { Page, PageRequest } from '@shared/domain/pagination.js';
import type { User, UserCredentials } from './user.entity.js';
import type { VisitedPlace } from './visited-countries.js';

export interface UserFilter {
  text?: string;
}

export interface UserSession {
  tokensValidAfter: Date | null;
}

export type CreateUserData = Pick<UserCredentials, 'name' | 'email'> &
  Partial<Pick<UserCredentials, 'passwordHash'>> & { googleId?: string };
export type UpdateUserData = Partial<Pick<User, 'name' | 'email'>> & {
  googleId?: string;
};

export abstract class UserRepository {
  abstract findAll(page: PageRequest, filter: UserFilter): Promise<Page<User>>;
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findByGoogleId(googleId: string): Promise<User | null>;
  abstract findCredentialsByEmail(
    email: string,
  ): Promise<UserCredentials | null>;
  abstract findSession(id: string): Promise<UserSession | null>;
  abstract findVisitedPlaces(userId: string): Promise<VisitedPlace[]>;
  abstract revokeTokens(id: string, validAfter: Date): Promise<void>;
  abstract create(data: CreateUserData): Promise<User>;
  abstract update(id: string, data: UpdateUserData): Promise<User>;
  abstract remove(id: string): Promise<void>;
}
