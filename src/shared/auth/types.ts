/**
 * Auth boundary interfaces — implementations arrive with Increment 2.
 */

export type AuthUser = {
  id: string;
  email: string | null;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  expiresAt: number | null;
};

export interface AuthBoundary {
  getSession(): Promise<AuthSession | null>;
  signOut(): Promise<void>;
}
