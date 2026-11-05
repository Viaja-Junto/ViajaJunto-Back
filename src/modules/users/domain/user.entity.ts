export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

/** A user together with what proves their identity; never leaves the auth flow. */
export interface UserCredentials extends User {
  passwordHash: string;
}
