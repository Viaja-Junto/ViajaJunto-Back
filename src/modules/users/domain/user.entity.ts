export const USER_ROLES = ['USER', 'ADMIN'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

/** A user together with what proves their identity; never leaves the auth flow. */
export interface UserCredentials extends User {
  /** Null for accounts that only sign in with Google. */
  passwordHash: string | null;
}
