import { api } from './api';
import { data, type Collection, type StoredItem } from './data';

/**
 * End-to-end encrypted backup. The key is derived on this device from a
 * passphrase only the person knows (PBKDF2-SHA256, 600 000 iterations) and
 * never leaves it; the server stores ciphertext, IV, salt and the iteration
 * count. Without the passphrase the backup cannot be read — not even by us.
 */
export const BACKUP_ITERATIONS = 600_000;
export const MIN_PASSPHRASE = 10;
const SKIP: Collection[] = ['auth', 'sync'];

function toB64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < arr.length; i += 0x8000) s += String.fromCharCode(...arr.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function deriveBackupKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations = BACKUP_ITERATIONS): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export interface SealedBackup {
  ciphertext: string;
  iv: string;
  salt: string;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
}

export async function sealBackup(payload: unknown, passphrase: string, iterations = BACKUP_ITERATIONS): Promise<SealedBackup> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(passphrase, salt, iterations);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
  return { ciphertext: toB64(cipher), iv: toB64(iv), salt: toB64(salt), kdf: 'PBKDF2-SHA256', iterations };
}

export async function openBackup<T = unknown>(sealed: SealedBackup, passphrase: string): Promise<T> {
  const key = await deriveBackupKey(passphrase, fromB64(sealed.salt), sealed.iterations);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(sealed.iv) }, key, fromB64(sealed.ciphertext));
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    throw new Error('La frase no coincide o la copia está dañada.');
  }
}

interface BackupPayload {
  app: 'amor-toxico';
  version: 1;
  createdAt: string;
  records: Record<string, StoredItem<unknown>[]>;
}

export async function createBackup(passphrase: string): Promise<{ ok: boolean; error?: string; updatedAt?: string }> {
  if (passphrase.length < MIN_PASSPHRASE) return { ok: false, error: `Usa una frase de al menos ${MIN_PASSPHRASE} caracteres.` };
  const all = await data().exportAll();
  for (const c of SKIP) delete all[c];
  const payload: BackupPayload = { app: 'amor-toxico', version: 1, createdAt: new Date().toISOString(), records: all };
  const sealed = await sealBackup(payload, passphrase);
  const r = await api<{ updatedAt: string }>('/backup', { method: 'PUT', json: sealed });
  return r.ok ? { ok: true, updatedAt: r.data?.updatedAt } : { ok: false, error: r.error };
}

export async function restoreBackup(passphrase: string): Promise<{ ok: boolean; error?: string; restored?: number }> {
  const r = await api<SealedBackup>('/backup');
  if (!r.ok || !r.data) return { ok: false, error: r.error ?? 'No hay copia guardada.' };
  let payload: BackupPayload;
  try {
    payload = await openBackup<BackupPayload>(r.data, passphrase);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  if (payload.app !== 'amor-toxico') return { ok: false, error: 'La copia no pertenece a esta app.' };
  let restored = 0;
  for (const [collection, items] of Object.entries(payload.records)) {
    if (SKIP.includes(collection as Collection)) continue;
    for (const it of items) {
      await data().put(collection as Collection, it.id, it.value);
      restored++;
    }
  }
  return { ok: true, restored };
}

export async function backupMeta(): Promise<{ updatedAt: string; size: number } | null> {
  const r = await api<{ backup: { updatedAt: string; size: number } | null }>('/backup/meta');
  return r.ok ? (r.data?.backup ?? null) : null;
}

export async function deleteBackup(): Promise<boolean> {
  return (await api('/backup', { method: 'DELETE' })).ok;
}
