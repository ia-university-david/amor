export type Role = 'user' | 'moderador' | 'editor' | 'admin';

export interface Session {
  id?: string;
  email: string;
  name: string;
  since: string;
  mode: 'local-dev' | 'remote';
  role?: Role;
  emailVerified?: boolean;
  adultConfirmed?: boolean;
  plan?: string;
  subscriptionStatus?: string | null;
  hasPassword?: boolean;
  consents?: { sync?: boolean; marketing?: boolean };
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  adultConfirmed?: boolean;
  consents?: { sync?: boolean; marketing?: boolean };
}

export interface AuthResult {
  ok: boolean;
  session?: Session;
  error?: string;
  message?: string;
}

export interface AuthProviders {
  password: boolean;
  magicLink: boolean;
  google: boolean;
  apple: boolean;
}

export interface AuthAdapter {
  readonly mode: 'local-dev' | 'remote';
  providers(): Promise<AuthProviders>;
  getSession(): Promise<Session | null>;
  register(input: RegisterInput): Promise<AuthResult>;
  login(email: string, password: string): Promise<AuthResult>;
  requestMagicLink(email: string, opts?: { name?: string; adultConfirmed?: boolean }): Promise<AuthResult>;
  consumeMagicLink(token: string): Promise<AuthResult>;
  verifyEmail(token: string): Promise<AuthResult>;
  requestVerification(): Promise<AuthResult>;
  forgotPassword(email: string): Promise<AuthResult>;
  resetPassword(token: string, password: string): Promise<AuthResult>;
  oauthUrl(provider: 'google' | 'apple'): string;
  logout(): Promise<void>;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export const MIN_PASSWORD_LENGTH = 8;
