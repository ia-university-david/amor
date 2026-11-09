import { isSyncCollection, mergeFromRemote, sanitizeForSync, SYNC_COLLECTIONS } from '../../shared/sync';
import { api } from './api';
import type { Collection, DataAdapter, StoredItem } from './data/DataAdapter';

interface QueuedChange {
  c: Collection;
  id: string;
  at: string;
  deleted?: boolean;
}

interface SyncState {
  lastPull: string | null;
  seeded: boolean;
}

interface RemoteDoc {
  collection: string;
  id: string;
  updatedAt: string;
  deleted: boolean;
  value: unknown;
}

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'error';

/**
 * Optional account sync. Wraps the local encrypted store: every write still
 * lands on the device first, and only records allowed by `sanitizeForSync`
 * are queued and sent (already stripped of free text). The queue holds keys
 * only; values are read and sanitized at send time.
 */
export class SyncEngine {
  private inner: DataAdapter | null = null;
  private enabled = false;
  private queue: QueuedChange[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private status: SyncStatus = 'off';
  private listeners = new Set<(s: SyncStatus) => void>();
  lastSyncedAt: string | null = null;

  wrap(inner: DataAdapter): DataAdapter {
    this.inner = inner;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const engine = this;
    return {
      get: (c, id) => inner.get(c, id),
      list: (c) => inner.list(c),
      exportAll: () => inner.exportAll(),
      async put(c, id, value) {
        await inner.put(c, id, value);
        if (engine.enabled && isSyncCollection(c) && sanitizeForSync(c, id, value) !== null) engine.enqueue({ c, id, at: new Date().toISOString() });
      },
      async remove(c, id) {
        await inner.remove(c, id);
        if (engine.enabled && isSyncCollection(c)) engine.enqueue({ c, id, at: new Date().toISOString(), deleted: true });
      },
      async clearCollection(c) {
        const items = engine.enabled && isSyncCollection(c) ? await inner.list(c) : [];
        await inner.clearCollection(c);
        const at = new Date().toISOString();
        for (const it of items) engine.enqueue({ c, id: it.id, at, deleted: true });
      },
      async clearAll() {
        engine.disable();
        await inner.clearAll();
      },
    };
  }

  onStatus(fn: (s: SyncStatus) => void): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  private setStatus(s: SyncStatus) {
    this.status = s;
    this.listeners.forEach((l) => l(s));
  }

  isEnabled() {
    return this.enabled;
  }

  private async state(): Promise<SyncState> {
    return (await this.inner!.get<SyncState>('sync', 'state')) ?? { lastPull: null, seeded: false };
  }

  async enable(): Promise<void> {
    if (!this.inner || this.enabled) return;
    this.enabled = true;
    this.queue = (await this.inner.get<QueuedChange[]>('sync', 'queue')) ?? [];
    const st = await this.state();
    if (!st.seeded) {
      const at = new Date().toISOString();
      for (const c of SYNC_COLLECTIONS) {
        for (const item of await this.inner.list(c as Collection)) this.queue.push({ c: c as Collection, id: item.id, at: item.updatedAt ?? at });
      }
      await this.inner.put('sync', 'state', { ...st, seeded: true });
      await this.persistQueue();
    }
    this.setStatus('idle');
    await this.syncNow();
  }

  disable(): void {
    this.enabled = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.setStatus('off');
  }

  /** Forget local sync bookkeeping (e.g. after signing out or turning sync off). */
  async reset(): Promise<void> {
    this.disable();
    this.queue = [];
    await this.inner?.remove('sync', 'queue');
    await this.inner?.remove('sync', 'state');
  }

  private enqueue(change: QueuedChange) {
    this.queue = this.queue.filter((q) => !(q.c === change.c && q.id === change.id));
    this.queue.push(change);
    void this.persistQueue();
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.push(), 1500);
  }

  private persistQueue() {
    return this.inner!.put('sync', 'queue', this.queue.slice(-2000));
  }

  async syncNow(): Promise<void> {
    if (!this.enabled) return;
    await this.push();
    await this.pull();
  }

  async push(): Promise<boolean> {
    if (!this.enabled || !this.inner || !this.queue.length) return true;
    this.setStatus('syncing');
    const batch = this.queue.slice(0, 200);
    const changes = [];
    for (const q of batch) {
      if (q.deleted) {
        changes.push({ collection: q.c, id: q.id, updatedAt: q.at, deleted: true });
        continue;
      }
      const value = sanitizeForSync(q.c, q.id, await this.inner.get(q.c, q.id));
      if (value !== null) changes.push({ collection: q.c, id: q.id, updatedAt: q.at, value });
    }
    const r = await api<{ accepted: number }>('/sync', { json: { changes } });
    if (!r.ok) {
      this.setStatus(r.status === 0 ? 'offline' : 'error');
      if (r.status === 403 || r.status === 401) this.disable();
      return false;
    }
    const sent = new Set(batch.map((b) => `${b.c}:${b.id}:${b.at}`));
    this.queue = this.queue.filter((q) => !sent.has(`${q.c}:${q.id}:${q.at}`));
    await this.persistQueue();
    this.lastSyncedAt = new Date().toISOString();
    this.setStatus('idle');
    if (this.queue.length) return this.push();
    return true;
  }

  async pull(): Promise<number> {
    if (!this.enabled || !this.inner) return 0;
    const st = await this.state();
    const r = await api<{ docs: RemoteDoc[]; serverTime: string }>(`/sync${st.lastPull ? `?since=${encodeURIComponent(st.lastPull)}` : ''}`);
    if (!r.ok || !r.data) {
      this.setStatus(r.status === 0 ? 'offline' : 'error');
      return 0;
    }
    let applied = 0;
    let maxAt = st.lastPull;
    for (const doc of r.data.docs) {
      if (!isSyncCollection(doc.collection)) continue;
      const c = doc.collection as Collection;
      if (!maxAt || doc.updatedAt > maxAt) maxAt = doc.updatedAt;
      const pending = this.queue.find((q) => q.c === c && q.id === doc.id);
      if (pending && pending.at >= doc.updatedAt) continue;
      if (doc.deleted) await this.inner.remove(c, doc.id);
      else await this.inner.put(c, doc.id, mergeFromRemote(c, doc.id, await this.inner.get(c, doc.id), doc.value));
      applied++;
    }
    await this.inner.put('sync', 'state', { ...st, lastPull: maxAt });
    this.lastSyncedAt = new Date().toISOString();
    this.setStatus('idle');
    if (applied && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('amor:synced', { detail: { applied } }));
    return applied;
  }

  pending(): number {
    return this.queue.length;
  }
}

export const syncEngine = new SyncEngine();

export type { StoredItem };
