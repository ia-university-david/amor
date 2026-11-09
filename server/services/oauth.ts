import { createHash } from 'node:crypto';
import { SignJWT, createRemoteJWKSet, importPKCS8, jwtVerify } from 'jose';
import type { Config } from '../config';
import { randomToken } from '../util';

export type OAuthProvider = 'google' | 'apple';

export interface OAuthIdentity {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export interface OAuthStart {
  url: string;
  state: string;
  verifier: string;
  nonce: string;
}

function redirectUri(config: Config, provider: OAuthProvider) {
  return `${new URL(config.APP_URL).origin}/api/auth/oauth/${provider}/callback`;
}

function challenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function startOAuth(config: Config, provider: OAuthProvider): OAuthStart {
  const state = randomToken(24);
  const verifier = randomToken(48);
  const nonce = randomToken(16);
  if (provider === 'google') {
    const p = new URLSearchParams({
      client_id: config.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri(config, 'google'),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: challenge(verifier),
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${p}`, state, verifier, nonce };
  }
  const p = new URLSearchParams({
    client_id: config.APPLE_CLIENT_ID!,
    redirect_uri: redirectUri(config, 'apple'),
    response_type: 'code',
    response_mode: 'form_post',
    scope: 'name email',
    state,
    nonce,
  });
  return { url: `https://appleid.apple.com/auth/authorize?${p}`, state, verifier, nonce };
}

const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

async function appleClientSecret(config: Config): Promise<string> {
  const key = await importPKCS8(config.APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n'), 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: config.APPLE_KEY_ID! })
    .setIssuer(config.APPLE_TEAM_ID!)
    .setAudience('https://appleid.apple.com')
    .setSubject(config.APPLE_CLIENT_ID!)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
}

/** Exchanges the authorization code and verifies the returned ID token. */
export async function finishOAuth(
  config: Config,
  provider: OAuthProvider,
  code: string,
  verifier: string,
  nonce: string,
  appleUser?: { name?: { firstName?: string; lastName?: string } },
): Promise<OAuthIdentity> {
  const isGoogle = provider === 'google';
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(config, provider),
    client_id: isGoogle ? config.GOOGLE_CLIENT_ID! : config.APPLE_CLIENT_ID!,
    client_secret: isGoogle ? config.GOOGLE_CLIENT_SECRET! : await appleClientSecret(config),
    ...(isGoogle ? { code_verifier: verifier } : {}),
  });
  const res = await fetch(isGoogle ? 'https://oauth2.googleapis.com/token' : 'https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Intercambio OAuth falló (${res.status})`);
  const tokens = (await res.json()) as { id_token?: string };
  if (!tokens.id_token) throw new Error('Sin id_token');
  const { payload } = await jwtVerify(tokens.id_token, isGoogle ? googleJwks : appleJwks, {
    issuer: isGoogle ? ['https://accounts.google.com', 'accounts.google.com'] : 'https://appleid.apple.com',
    audience: isGoogle ? config.GOOGLE_CLIENT_ID! : config.APPLE_CLIENT_ID!,
  });
  if (payload.nonce !== nonce) throw new Error('nonce no coincide');
  const email = String(payload.email ?? '');
  if (!email) throw new Error('El proveedor no devolvió un correo');
  const verified = payload.email_verified === true || payload.email_verified === 'true';
  const appleName = [appleUser?.name?.firstName, appleUser?.name?.lastName].filter(Boolean).join(' ');
  return {
    provider,
    providerUserId: String(payload.sub),
    email,
    emailVerified: verified,
    name: (isGoogle ? (payload.given_name as string | undefined) ?? (payload.name as string | undefined) : appleName) || undefined,
  };
}
