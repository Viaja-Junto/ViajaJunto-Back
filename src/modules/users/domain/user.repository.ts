import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import type { User, UserCredentials } from './user.entity.js';
import type { VisitedPlace } from './visited-countries.js';

export interface UserFilter {
  /** Case-insensitive text contained in the name or the email. */
  text?: string;
}

/** The part of an account that decides whether its tokens are still valid. */
export interface UserSession {
  tokensValidAfter: Date | null;
}

export type CreateUserData = Pick<
  UserCredentials,
  'name' | 'email' | 'passwordHash'
>;
export type UpdateUserData = Partial<Pick<User, 'name' | 'email'>>;

export abstract class UserRepository {
  /** Newest first. */
  abstract findAll(page: PageRequest, filter: UserFilter): Promise<Page<User>>;
  abstract findById(id: string): Promise<User | null>;
  abstract findCredentialsByEmail(
    email: string,
  ): Promise<UserCredentials | null>;
  /** Null when the account no longer exists. */
  abstract findSession(id: string): Promise<UserSession | null>;
  /** The destinations of the user's completed trips, as creator or member. */
  abstract findVisitedPlaces(userId: string): Promise<VisitedPlace[]>;
  /** Refuses every access token issued before `validAfter`. */
  abstract revokeTokens(id: string, validAfter: Date): Promise<void>;
  abstract create(data: CreateUserData): Promise<User>;
  abstract update(id: string, data: UpdateUserData): Promise<User>;
  /** Its reviews go with it, and the ratings they fed are refreshed. */
  abstract remove(id: string): Promise<void>;
}
