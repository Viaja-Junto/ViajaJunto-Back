import type { User, UserCredentials } from './user.entity.js';

export type CreateUserData = Omit<UserCredentials, 'id' | 'createdAt'>;

/**
 * Declared as an abstract class rather than an interface: Nest resolves
 * providers by a token that must exist at runtime.
 */
export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract findCredentialsByEmail(
    email: string,
  ): Promise<UserCredentials | null>;
  abstract create(data: CreateUserData): Promise<User>;
}
