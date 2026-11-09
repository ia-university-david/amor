/**
 * Local at-rest encryption for sensitive records.
 *
 * The AES-GCM key is generated with `extractable: false`, so its raw bytes can
 * never be read by page scripts; it is persisted as a CryptoKey object in
 * IndexedDB (structured clone keeps it non-extractable). This protects data
 * from casual inspection of the storage and from accidental leaks into Cache
 * Storage or exports, but it does not protect against code running in this
 * origin, which can still ask the browser to decrypt.
 */

export interface EncryptedPayload {
  iv: Uint8Array<ArrayBuffer>;
  data: ArrayBuffer;
}

const ALGORITHM = 'AES-GCM';

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error('WebCrypto no está disponible en este navegador.');
  return c.subtle;
}

export function generateDataKey(): Promise<CryptoKey> {
  return subtle().generateKey({ name: ALGORITHM, length: 256 }, false, ['encrypt', 'decrypt']) as Promise<CryptoKey>;
}

export async function encryptJSON(key: CryptoKey, value: unknown): Promise<EncryptedPayload> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const data = await subtle().encrypt({ name: ALGORITHM, iv }, key, encoded);
  return { iv, data };
}

export async function decryptJSON<T = unknown>(key: CryptoKey, payload: EncryptedPayload): Promise<T> {
  const plain = await subtle().decrypt({ name: ALGORITHM, iv: payload.iv }, key, payload.data);
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function randomSalt(length = 16): string {
  return toHex(globalThis.crypto.getRandomValues(new Uint8Array(length)));
}

/** PBKDF2-SHA256 password hash used only by the local development auth adapter. */
export async function hashPassword(password: string, saltHex: string, iterations = 210_000): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const baseKey = await subtle().importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, baseKey, 256);
  return toHex(bits);
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
