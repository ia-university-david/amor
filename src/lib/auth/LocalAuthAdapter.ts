import { constantTimeEqual, hashPassword, randomSalt } from '../crypto';
import { data } from '../data';
import {
  type AuthAdapter,
  type AuthProviders,
  type AuthResult,
  type RegisterInput,
  type Session,
  MIN_PASSWORD_LENGTH,
  isValidEmail,
} from './AuthAdapter';

interface LocalAccount {
  email: string;
  name: string;
  salt: string;
  hash: string;
  iterations: number;
  createdAt: string;
}

const ITERATIONS = 210_000;

/**
 * DEVELOPMENT ONLY. Stores a PBKDF2 hash of the password on this device so the
 * onboarding flow can be exercised end to end. It is not an authentication
 * system: there is no server, no account recovery and no protection against
 * someone with access to this browser profile. Enabled with VITE_AUTH_MODE=local.
 */
const UNAVAILABLE: AuthResult = { ok: false, error: 'No disponible en el modo local de desarrollo.' };

export class LocalAuthAdapter implements AuthAdapter {
  readonly mode = 'local-dev' as const;

  async providers(): Promise<AuthProviders> {
    return { password: true, magicLink: false, google: false, apple: false };
  }

  async consumeMagicLink() {
    return UNAVAILABLE;
  }
  async verifyEmail() {
    return UNAVAILABLE;
  }
  async requestVerification() {
    return UNAVAILABLE;
  }
  async forgotPassword() {
    return UNAVAILABLE;
  }
  async resetPassword() {
    return UNAVAILABLE;
  }
  oauthUrl() {
    return '#';
  }

  async getSession(): Promise<Session | null> {
    return (await data().get<Session>('auth', 'session')) ?? null;
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    if (!input.name.trim()) return { ok: false, error: 'Escribe un nombre o seudónimo.' };
    if (!isValidEmail(email)) return { ok: false, error: 'Revisa el correo electrónico.' };
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      return { ok: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` };
    }
    const existing = await data().get<LocalAccount>('auth', 'account');
    if (existing && existing.email !== email) {
      return { ok: false, error: 'Ya hay una cuenta local en este dispositivo. Inicia sesión o borra los datos desde Perfil.' };
    }
    const salt = randomSalt();
    const hash = await hashPassword(input.password, salt, ITERATIONS);
    await data().put<LocalAccount>('auth', 'account', {
      email,
      name: input.name.trim(),
      salt,
      hash,
      iterations: ITERATIONS,
      createdAt: new Date().toISOString(),
    });
    return this.startSession(email, input.name.trim());
  }

  async login(emailRaw: string, password: string): Promise<AuthResult> {
    const email = emailRaw.trim().toLowerCase();
    const account = await data().get<LocalAccount>('auth', 'account');
    if (!account || account.email !== email) return { ok: false, error: 'No encontramos una cuenta con ese correo en este dispositivo.' };
    const hash = await hashPassword(password, account.salt, account.iterations);
    if (!constantTimeEqual(hash, account.hash)) return { ok: false, error: 'La contraseña no coincide.' };
    return this.startSession(account.email, account.name);
  }

  async requestMagicLink(): Promise<AuthResult> {
    return {
      ok: false,
      error: 'El acceso con enlace mágico estará disponible cuando el servidor esté configurado. Por ahora, usa una contraseña.',
    };
  }

  async logout(): Promise<void> {
    await data().remove('auth', 'session');
  }

  private async startSession(email: string, name: string): Promise<AuthResult> {
    const session: Session = { email, name, since: new Date().toISOString(), mode: 'local-dev', adultConfirmed: true, emailVerified: false, role: 'user' };
    await data().put('auth', 'session', session);
    return { ok: true, session };
  }
}

