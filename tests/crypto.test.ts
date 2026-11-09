import { describe, expect, it } from 'vitest';
import { decryptJSON, encryptJSON, generateDataKey, hashPassword, randomSalt } from '../src/lib/crypto';
import { LocalDataAdapter, readRawSecureRecord } from '../src/lib/data/LocalDataAdapter';

describe('cifrado AES-GCM', () => {
  it('cifra y descifra un objeto (ida y vuelta)', async () => {
    const key = await generateDataKey();
    expect(key.extractable).toBe(false);
    const value = { texto: 'Hoy lo extrañé mucho', n: 7, lista: ['a', 'ñ'] };
    const payload = await encryptJSON(key, value);
    expect(payload.iv).toHaveLength(12);
    expect(await decryptJSON(key, payload)).toEqual(value);
  });

  it('usa un IV distinto en cada cifrado', async () => {
    const key = await generateDataKey();
    const a = await encryptJSON(key, 'x');
    const b = await encryptJSON(key, 'x');
    expect(Buffer.from(a.iv).equals(Buffer.from(b.iv))).toBe(false);
  });

  it('falla al descifrar con otra clave', async () => {
    const payload = await encryptJSON(await generateDataKey(), 'secreto');
    await expect(decryptJSON(await generateDataKey(), payload)).rejects.toBeTruthy();
  });

  it('no permite exportar la clave', async () => {
    const key = await generateDataKey();
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toBeTruthy();
  });

  it('PBKDF2 es determinista con la misma sal y distinto con otra', async () => {
    const salt = randomSalt();
    const a = await hashPassword('clave segura', salt, 1000);
    expect(await hashPassword('clave segura', salt, 1000)).toBe(a);
    expect(await hashPassword('clave segura', randomSalt(), 1000)).not.toBe(a);
  });
});

describe('LocalDataAdapter', () => {
  it('guarda datos sensibles cifrados en IndexedDB y los recupera', async () => {
    const dbName = 'test-' + Math.random();
    const adapter = new LocalDataAdapter(dbName);
    await adapter.put('diary', 'd1', { texto: 'Mi entrada privada' });
    expect(await adapter.get('diary', 'd1')).toEqual({ texto: 'Mi entrada privada' });

    const raw = (await readRawSecureRecord(dbName, 'diary', 'd1')) as Record<string, unknown>;
    expect(JSON.stringify(raw)).not.toContain('Mi entrada privada');
    expect(raw.payload).toBeDefined();

    const list = await adapter.list('diary');
    expect(list).toHaveLength(1);

    // Una nueva instancia reutiliza la misma clave guardada.
    const again = new LocalDataAdapter(dbName);
    expect(await again.get('diary', 'd1')).toEqual({ texto: 'Mi entrada privada' });
  });

  it('borra todo, incluida la clave', async () => {
    const adapter = new LocalDataAdapter('test-' + Math.random());
    await adapter.put('settings', 'app', { theme: 'dark' });
    await adapter.put('notes', 'n1', 'nota');
    await adapter.clearAll();
    expect(await adapter.get('settings', 'app')).toBeUndefined();
    expect(await adapter.list('notes')).toEqual([]);
  });

  it('exporta los datos descifrados sin incluir credenciales', async () => {
    const adapter = new LocalDataAdapter('test-' + Math.random());
    await adapter.put('auth', 'account', { hash: 'x' });
    await adapter.put('moods', 'm1', { emotion: 'tristeza' });
    const exported = await adapter.exportAll();
    expect(exported.moods[0].value).toEqual({ emotion: 'tristeza' });
    expect(exported.auth).toBeUndefined();
  });
});
