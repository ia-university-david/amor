import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))));
}

const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keylen: 64 };

/** scrypt password hash: `scrypt$N$r$p$salt$hash` (base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 128 * 1024 * 1024 });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [alg, n, r, p, saltB64, hashB64] = stored.split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(hashB64, 'base64url');
  const key = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64url'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 128 * 1024 * 1024,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** A hash to compare against when the account does not exist, to keep timing similar. */
export const DUMMY_HASH = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$' + Buffer.alloc(64).toString('base64url');

/**
 * Server-side encryption at rest for synced records (AES-256-GCM). The key
 * comes from DATA_ENCRYPTION_KEY (32 random bytes, base64). This protects the
 * database file and its backups; it is not end-to-end encryption.
 */
export class Vault {
  private readonly key: Buffer;

  constructor(secret: string | undefined, allowDevKey: boolean) {
    if (secret) {
      const raw = Buffer.from(secret, 'base64');
      this.key = raw.length === 32 ? raw : createHash('sha256').update(secret).digest();
    } else if (allowDevKey) {
      this.key = createHash('sha256').update('amor-toxico-dev-only-key').digest();
    } else {
      throw new Error('DATA_ENCRYPTION_KEY requerida');
    }
  }

  seal(value: unknown): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
  }

  open<T = unknown>(sealed: string): T {
    const [v, ivB64, tagB64, dataB64] = sealed.split(':');
    if (v !== 'v1') throw new Error('Formato de cifrado desconocido');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
    return JSON.parse(plain.toString('utf8')) as T;
  }
}
