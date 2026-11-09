import { API_BASE, api, getServerConfig } from '../api';
import { data } from '../data';
import { type AuthAdapter, type AuthResult, type RegisterInput, type Session, MIN_PASSWORD_LENGTH, isValidEmail } from './AuthAdapter';

interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: Session['role'];
  emailVerified: boolean;
  adultConfirmed: boolean;
  plan: string;
  subscriptionStatus: string | null;
  hasPassword: boolean;
  consents: Record<string, boolean>;
  createdAt: string;
}

export function toSession(u: ApiUser): Session {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    since: u.createdAt,
    mode: 'remote',
    role: u.role,
    emailVerified: u.emailVerified,
    adultConfirmed: u.adultConfirmed,
    plan: u.plan,
    subscriptionStatus: u.subscriptionStatus,
    hasPassword: u.hasPassword,
    consents: u.consents,
  };
}

/**
 * Talks to /api/auth. The session itself lives in an httpOnly cookie; a copy
 * of the public profile is cached on the device so the app knows who is
 * signed in while offline.
 */
export class RemoteAuthAdapter implements AuthAdapter {
  readonly mode = 'remote' as const;

  async providers() {
    const c = await getServerConfig();
    return c.auth;
  }

  private async remember(user: ApiUser | null): Promise<Session | null> {
    if (!user) {
      await data().remove('auth', 'session');
      return null;
    }
    const s = toSession(user);
    await data().put('auth', 'session', s);
    return s;
  }

  private async withUser(path: string, json: unknown): Promise<AuthResult> {
    const r = await api<{ user: ApiUser | null; message?: string }>(path, { json });
    if (!r.ok) return { ok: false, error: r.error };
    const session = r.data?.user ? await this.remember(r.data.user) : undefined;
    return { ok: true, session: session ?? undefined, message: r.data?.message };
  }

  async getSession(): Promise<Session | null> {
    const r = await api<{ user: ApiUser | null }>('/auth/session');
    if (r.ok) return this.remember(r.data?.user ?? null);
    // Offline or server unavailable: keep the last known session.
    const cached = (await data().get<Session>('auth', 'session')) ?? null;
    return cached?.mode === 'remote' ? cached : null;
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    if (!input.name.trim()) return { ok: false, error: 'Escribe un nombre o seudónimo.' };
    if (!isValidEmail(input.email)) return { ok: false, error: 'Revisa el correo electrónico.' };
    if (input.password.length < MIN_PASSWORD_LENGTH) return { ok: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` };
    if (!input.adultConfirmed) return { ok: false, error: 'Para continuar, confirma que eres mayor de edad.' };
    return this.withUser('/auth/register', { ...input, email: input.email.trim(), adultConfirmed: true });
  }

  login(email: string, password: string): Promise<AuthResult> {
    if (!isValidEmail(email)) return Promise.resolve({ ok: false, error: 'Revisa el correo electrónico.' });
    return this.withUser('/auth/login', { email: email.trim(), password });
  }

  requestMagicLink(email: string, opts: { name?: string; adultConfirmed?: boolean } = {}) {
    if (!isValidEmail(email)) return Promise.resolve({ ok: false, error: 'Escribe tu correo electrónico para recibir el enlace.' });
    return this.withUser('/auth/magic-link', { email: email.trim(), ...opts });
  }

  consumeMagicLink(token: string) {
    return this.withUser('/auth/magic-link/consume', { token });
  }

  verifyEmail(token: string) {
    return this.withUser('/auth/verify-email', { token });
  }

  requestVerification() {
    return this.withUser('/auth/verify-email/request', {});
  }

  forgotPassword(email: string) {
    if (!isValidEmail(email)) return Promise.resolve({ ok: false, error: 'Revisa el correo electrónico.' });
    return this.withUser('/auth/password/forgot', { email: email.trim() });
  }

  resetPassword(token: string, password: string) {
    if (password.length < MIN_PASSWORD_LENGTH) return Promise.resolve({ ok: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` });
    return this.withUser('/auth/password/reset', { token, password });
  }

  oauthUrl(provider: 'google' | 'apple') {
    return `${API_BASE}/auth/oauth/${provider}/start`;
  }

  async logout(): Promise<void> {
    await api('/auth/logout', { method: 'POST' });
    await this.remember(null);
  }
}
