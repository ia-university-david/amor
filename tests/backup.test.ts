import { describe, expect, it } from 'vitest';
import { openBackup, sealBackup } from '../src/lib/backup';

describe('copia cifrada de extremo a extremo', () => {
  const payload = { diario: [{ texto: 'Hoy pensé en escribirle y no lo hice' }] };

  it('cifra y descifra con la misma frase', async () => {
    const sealed = await sealBackup(payload, 'una frase larga y mía', 1000);
    expect(sealed.kdf).toBe('PBKDF2-SHA256');
    expect(sealed.iterations).toBe(1000);
    expect(await openBackup(sealed, 'una frase larga y mía')).toEqual(payload);
  });

  it('el texto cifrado no contiene el contenido original', async () => {
    const sealed = await sealBackup(payload, 'una frase larga y mía', 1000);
    const raw = Buffer.from(sealed.ciphertext, 'base64').toString('utf8');
    expect(raw).not.toContain('escribirle');
    expect(sealed.ciphertext).not.toContain('escribirle');
  });

  it('falla con otra frase', async () => {
    const sealed = await sealBackup(payload, 'una frase larga y mía', 1000);
    await expect(openBackup(sealed, 'otra frase distinta')).rejects.toThrow(/frase no coincide/);
  });

  it('usa sal e IV nuevos en cada copia', async () => {
    const a = await sealBackup(payload, 'una frase larga y mía', 1000);
    const b = await sealBackup(payload, 'una frase larga y mía', 1000);
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('usa 600 000 iteraciones por defecto', async () => {
    const { BACKUP_ITERATIONS } = await import('../src/lib/backup');
    expect(BACKUP_ITERATIONS).toBeGreaterThanOrEqual(600_000);
  });
});
