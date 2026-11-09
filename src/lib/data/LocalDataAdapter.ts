import { decryptJSON, encryptJSON, generateDataKey, type EncryptedPayload } from '../crypto';
import { type Collection, type DataAdapter, type StoredItem, isSensitive } from './DataAdapter';
import { DB_NAME, STORES, openDatabase, requestToPromise, txDone } from './idb';

const KEY_ID = 'data-key-v1';

interface PlainRecord {
  key: string;
  collection: Collection;
  id: string;
  value: unknown;
  updatedAt: string;
}

interface SecureRecord {
  key: string;
  collection: Collection;
  id: string;
  payload: EncryptedPayload;
  updatedAt: string;
}

const ALL_COLLECTIONS: Collection[] = [
  'settings', 'content', 'auth', 'profile', 'onboarding', 'diary', 'notes', 'unsent', 'reminders',
  'events', 'limits', 'exercises', 'progress', 'moods', 'chat', 'contacts', 'leads',
];

export class LocalDataAdapter implements DataAdapter {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private keyPromise: Promise<CryptoKey> | null = null;

  constructor(private readonly dbName = DB_NAME) {}

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) this.dbPromise = openDatabase(this.dbName);
    return this.dbPromise;
  }

  private key(): Promise<CryptoKey> {
    if (!this.keyPromise) {
      this.keyPromise = (async () => {
        const db = await this.db();
        const existing = await requestToPromise(
          db.transaction(STORES.keys, 'readonly').objectStore(STORES.keys).get(KEY_ID),
        );
        if (existing) return existing as CryptoKey;
        const key = await generateDataKey();
        const tx = db.transaction(STORES.keys, 'readwrite');
        tx.objectStore(STORES.keys).put(key, KEY_ID);
        await txDone(tx);
        return key;
      })();
      this.keyPromise.catch(() => {
        this.keyPromise = null;
      });
    }
    return this.keyPromise;
  }

  async get<T>(collection: Collection, id: string): Promise<T | undefined> {
    const db = await this.db();
    const store = isSensitive(collection) ? STORES.secure : STORES.plain;
    const record = await requestToPromise(
      db.transaction(store, 'readonly').objectStore(store).get(`${collection}:${id}`),
    );
    if (!record) return undefined;
    if (isSensitive(collection)) {
      return decryptJSON<T>(await this.key(), (record as SecureRecord).payload);
    }
    return (record as PlainRecord).value as T;
  }

  async put<T>(collection: Collection, id: string, value: T): Promise<void> {
    const db = await this.db();
    const updatedAt = new Date().toISOString();
    const key = `${collection}:${id}`;
    if (isSensitive(collection)) {
      const payload = await encryptJSON(await this.key(), value);
      const tx = db.transaction(STORES.secure, 'readwrite');
      tx.objectStore(STORES.secure).put({ key, collection, id, payload, updatedAt } satisfies SecureRecord);
      await txDone(tx);
    } else {
      const tx = db.transaction(STORES.plain, 'readwrite');
      tx.objectStore(STORES.plain).put({ key, collection, id, value, updatedAt } satisfies PlainRecord);
      await txDone(tx);
    }
  }

  async list<T>(collection: Collection): Promise<StoredItem<T>[]> {
    const db = await this.db();
    const sensitive = isSensitive(collection);
    const store = sensitive ? STORES.secure : STORES.plain;
    const records = (await requestToPromise(
      db.transaction(store, 'readonly').objectStore(store).index('collection').getAll(collection),
    )) as (PlainRecord | SecureRecord)[];
    const key = sensitive ? await this.key() : null;
    const items = await Promise.all(
      records.map(async (r) => ({
        id: r.id,
        updatedAt: r.updatedAt,
        value: sensitive
          ? await decryptJSON<T>(key!, (r as SecureRecord).payload)
          : ((r as PlainRecord).value as T),
      })),
    );
    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async remove(collection: Collection, id: string): Promise<void> {
    const db = await this.db();
    const store = isSensitive(collection) ? STORES.secure : STORES.plain;
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(`${collection}:${id}`);
    await txDone(tx);
  }

  async clearCollection(collection: Collection): Promise<void> {
    const db = await this.db();
    const store = isSensitive(collection) ? STORES.secure : STORES.plain;
    const keys = await requestToPromise(
      db.transaction(store, 'readonly').objectStore(store).index('collection').getAllKeys(collection),
    );
    const tx = db.transaction(store, 'readwrite');
    for (const k of keys) tx.objectStore(store).delete(k);
    await txDone(tx);
  }

  async clearAll(): Promise<void> {
    const db = await this.db();
    const tx = db.transaction([STORES.keys, STORES.plain, STORES.secure], 'readwrite');
    tx.objectStore(STORES.keys).clear();
    tx.objectStore(STORES.plain).clear();
    tx.objectStore(STORES.secure).clear();
    await txDone(tx);
    this.keyPromise = null;
  }

  async exportAll(): Promise<Record<string, StoredItem<unknown>[]>> {
    const out: Record<string, StoredItem<unknown>[]> = {};
    for (const c of ALL_COLLECTIONS) {
      if (c === 'auth') continue;
      const items = await this.list(c);
      if (items.length) out[c] = items;
    }
    return out;
  }
}

/** Raw access used by tests to assert that sensitive values are not stored in clear. */
export async function readRawSecureRecord(dbName: string, collection: Collection, id: string): Promise<unknown> {
  const db = await openDatabase(dbName);
  return requestToPromise(db.transaction(STORES.secure, 'readonly').objectStore(STORES.secure).get(`${collection}:${id}`));
}
