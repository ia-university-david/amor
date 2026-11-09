import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const now = () => new Date().toISOString();

export const newId = () => randomUUID();

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function addMinutes(minutes: number, from = new Date()): string {
  return new Date(from.getTime() + minutes * 60_000).toISOString();
}

export function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function parseJSON<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
