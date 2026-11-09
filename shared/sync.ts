/**
 * What leaves the device when the person turns on account sync.
 *
 * Only structured data (profile basics, plan, progress, limits, counters,
 * check-ins) is synced. Free text written by the person — diary, notes,
 * unsent messages, reflections, learnings, chat — never goes through sync;
 * it can only leave the device inside an end-to-end encrypted backup.
 */
export const SYNC_COLLECTIONS = ['settings', 'profile', 'progress', 'limits', 'moods', 'events'] as const;
export type SyncCollection = (typeof SYNC_COLLECTIONS)[number];

export function isSyncCollection(c: string): c is SyncCollection {
  return (SYNC_COLLECTIONS as readonly string[]).includes(c);
}

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function pick(v: Obj, keys: string[]): Obj {
  const out: Obj = {};
  for (const k of keys) if (v[k] !== undefined) out[k] = v[k];
  return out;
}

function omit(v: Obj, keys: string[]): Obj {
  const out: Obj = { ...v };
  for (const k of keys) delete out[k];
  return out;
}

const PROFILE_KEYS = ['name', 'country', 'language', 'adultConfirmed', 'createdAt', 'plan'];
const SETTINGS_KEYS = ['theme', 'reducedMotion', 'onboardingComplete', 'consents', 'notifications'];
const EVENT_FREE_TEXT = ['learning', 'reflection', 'nextStrategy', 'seeking'];

/**
 * Returns the value that may be sent to the server for this record, or
 * `null` when the record must stay on the device.
 */
export function sanitizeForSync(collection: string, id: string, value: unknown): unknown | null {
  if (!isSyncCollection(collection) || !isObj(value)) return null;
  switch (collection) {
    case 'settings':
      return id === 'app' ? pick(value, SETTINGS_KEYS) : null;
    case 'profile':
      return id === 'me' ? pick(value, PROFILE_KEYS) : null;
    case 'progress':
      return value;
    case 'limits':
      if (id === 'state') return pick(value, ['modality', 'rules']);
      if (id === 'counter') {
        const resets = Array.isArray(value.resets) ? value.resets.filter(isObj).map((r) => pick(r, ['at'])) : [];
        return { ...pick(value, ['enabled', 'startedAt']), resets };
      }
      return null;
    case 'moods':
      return pick(value, ['date', 'emotion']);
    case 'events':
      return omit(value, EVENT_FREE_TEXT);
  }
}

/**
 * Merges a record pulled from the server into the local one, keeping fields
 * that only exist on this device (free text, notes, motives).
 */
export function mergeFromRemote(collection: string, id: string, local: unknown, remote: unknown): unknown {
  if (!isObj(remote)) return local ?? remote;
  if (!isObj(local)) return remote;
  if (collection === 'limits' && id === 'counter') {
    const localResets = Array.isArray(local.resets) ? (local.resets as Obj[]) : [];
    const remoteResets = Array.isArray(remote.resets) ? (remote.resets as Obj[]) : [];
    const byAt = new Map<string, Obj>();
    for (const r of remoteResets) byAt.set(String(r.at), r);
    for (const r of localResets) byAt.set(String(r.at), { ...byAt.get(String(r.at)), ...r });
    const resets = [...byAt.values()].sort((a, b) => String(a.at).localeCompare(String(b.at)));
    return { ...local, ...remote, resets };
  }
  if (collection === 'settings' && isObj(local.consents) && isObj(remote.consents)) {
    return { ...local, ...remote, consents: { ...local.consents, ...remote.consents } };
  }
  return { ...local, ...remote };
}
