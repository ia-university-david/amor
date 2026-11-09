export interface Session {
  email: string;
  name: string;
  since: string;
  mode: 'local-dev' | 'remote';
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface AuthResult {
  ok: boolean;
  session?: Session;
  error?: string;
}

export interface AuthAdapter {
  readonly providers: { magicLink: boolean; google: boolean; apple: boolean };
  getSession(): Promise<Session | null>;
  register(input: RegisterInput): Promise<AuthResult>;
  login(email: string, password: string): Promise<AuthResult>;
  requestMagicLink(email: string): Promise<AuthResult>;
  logout(): Promise<void>;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export const MIN_PASSWORD_LENGTH = 8;
