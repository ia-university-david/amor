/**
 * Storage abstraction. Phase 1 ships `LocalDataAdapter` (IndexedDB + AES-GCM);
 * a future `RemoteDataAdapter` can implement the same contract against the
 * backend API without touching the UI.
 */

export type Collection =
  // Non-sensitive (stored in clear on the device)
  | 'settings'
  | 'content'
  | 'auth'
  // Sensitive (always encrypted at rest)
  | 'profile'
  | 'onboarding'
  | 'diary'
  | 'notes'
  | 'unsent'
  | 'reminders'
  | 'events'
  | 'limits'
  | 'exercises'
  | 'progress'
  | 'moods'
  | 'chat'
  | 'contacts'
  | 'leads';

export const PLAIN_COLLECTIONS: ReadonlySet<Collection> = new Set(['settings', 'content', 'auth']);

export function isSensitive(collection: Collection): boolean {
  return !PLAIN_COLLECTIONS.has(collection);
}

export interface StoredItem<T> {
  id: string;
  value: T;
  updatedAt: string;
}

export interface DataAdapter {
  get<T>(collection: Collection, id: string): Promise<T | undefined>;
  put<T>(collection: Collection, id: string, value: T): Promise<void>;
  list<T>(collection: Collection): Promise<StoredItem<T>[]>;
  remove(collection: Collection, id: string): Promise<void>;
  clearCollection(collection: Collection): Promise<void>;
  /** Deletes every record and the encryption key. */
  clearAll(): Promise<void>;
  /** Decrypted export of everything the user has stored, for portability. */
  exportAll(): Promise<Record<string, StoredItem<unknown>[]>>;
}

export function newId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
