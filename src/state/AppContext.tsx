import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LibraryEntry } from '../content/library';
import type { ProductMessage } from '../content/messages';
import { OFFLINE_CONFIG, api, getServerConfig, type ServerConfig } from '../lib/api';
import { auth, type Session } from '../lib/auth';
import { STATIC, cachedContent, fetchContent, toLibraryEntry, toMessage } from '../lib/content';
import { data } from '../lib/data';
import type { InitialPlan } from '../lib/plan';
import { scheduleDailyReminder } from '../lib/notifications';
import { flushPendingLeads } from '../lib/leads';
import { syncEngine, type SyncStatus } from '../lib/sync';
import type { LibraryData } from '../../shared/content';

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  reducedMotion: boolean;
  onboardingComplete: boolean;
  guest: boolean;
  consents: { memory: boolean; aiSensitive: boolean };
  /** `push` means reminders are delivered by the server (Web Push) instead of local timers. */
  notifications: { enabled: boolean; time: string; push?: boolean };
  installDismissed: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  reducedMotion: false,
  onboardingComplete: false,
  guest: false,
  consents: { memory: false, aiSensitive: false },
  notifications: { enabled: false, time: '21:00' },
  installDismissed: false,
};

export interface Profile {
  name: string;
  email?: string;
  country?: string;
  language?: string;
  adultConfirmed?: boolean;
  createdAt: string;
  plan?: InitialPlan;
  reminder?: string;
  motives?: string[];
}

interface AppState {
  ready: boolean;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  session: Session | null;
  setSession: (s: Session | null) => void;
  refreshSession: () => Promise<Session | null>;
  signOut: () => Promise<void>;
  setSyncConsent: (on: boolean) => Promise<boolean>;
  syncStatus: SyncStatus;
  server: ServerConfig;
  profile: Profile | null;
  updateProfile: (patch: Partial<Profile>) => Promise<Profile>;
  messages: ProductMessage[];
  library: LibraryEntry[];
  resetAll: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

function applyTheme(settings: Settings) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const theme = settings.theme === 'system' ? (prefersDark ? 'dark' : 'light') : settings.theme;
  root.dataset.theme = theme;
  root.dataset.motion = settings.reducedMotion ? 'reduced' : 'full';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#12131c' : '#FAFAFC');
}

function mergeSettings(s: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...s, consents: { ...DEFAULT_SETTINGS.consents, ...s?.consents }, notifications: { ...DEFAULT_SETTINGS.notifications, ...s?.notifications } };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ProductMessage[]>(STATIC.messages);
  const [library, setLibrary] = useState<LibraryEntry[]>(STATIC.library);
  const [server, setServer] = useState<ServerConfig>(OFFLINE_CONFIG);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('off');

  const loadLocal = useCallback(async () => {
    const [s, p] = await Promise.all([data().get<Settings>('settings', 'app'), data().get<Profile>('profile', 'me')]);
    if (s) setSettings(mergeSettings(s));
    setProfile(p ?? null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadLocal();
        const [m, l] = await Promise.all([cachedContent<{ text: string }>('message'), cachedContent<LibraryData>('library')]);
        if (m?.length) setMessages(m.map(toMessage));
        if (l?.length) setLibrary(l.map(toLibraryEntry));
        // Cached session first so the app opens instantly (and offline).
        const cached = await data().get<Session>('auth', 'session');
        if (cached) setSession(cached);
      } catch (err) {
        console.error('No se pudieron cargar los datos locales', err);
      } finally {
        setReady(true);
      }
      const [cfg, sess] = await Promise.all([getServerConfig(), auth.getSession().catch(() => null)]);
      setServer(cfg);
      setSession(sess);
      if (cfg.online) void flushPendingLeads();
      const [m, l] = await Promise.all([fetchContent<{ text: string }>('message'), fetchContent<LibraryData>('library')]);
      if (m?.length) setMessages(m.map(toMessage));
      if (l?.length) setLibrary(l.map(toLibraryEntry));
    })();
  }, [loadLocal]);

  useEffect(() => syncEngine.onStatus(setSyncStatus), []);

  // Account sync runs only with the explicit consent stored on the account.
  const syncOn = session?.mode === 'remote' && Boolean(session.consents?.sync);
  useEffect(() => {
    if (syncOn) void syncEngine.enable();
    else syncEngine.disable();
  }, [syncOn]);

  useEffect(() => {
    const onSynced = () => void loadLocal();
    const onFocus = () => {
      void syncEngine.syncNow();
      void flushPendingLeads();
    };
    window.addEventListener('amor:synced', onSynced);
    window.addEventListener('online', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('amor:synced', onSynced);
      window.removeEventListener('online', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [loadLocal]);

  useEffect(() => {
    applyTheme(settings);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(settings);
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, [settings]);

  useEffect(() => {
    if (!settings.notifications.enabled || settings.notifications.push) return;
    return scheduleDailyReminder(settings.notifications.time, 'Un momento para ti: ¿cómo estás hoy?');
  }, [settings.notifications.enabled, settings.notifications.time, settings.notifications.push]);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next: Settings = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    await data().put('settings', 'app', next);
  }, []);

  const profileRef = useRef(profile);
  profileRef.current = profile;

  const updateProfile = useCallback(async (patch: Partial<Profile>) => {
    const next: Profile = { createdAt: new Date().toISOString(), name: '', ...(profileRef.current ?? {}), ...patch };
    profileRef.current = next;
    setProfile(next);
    await data().put('profile', 'me', next);
    return next;
  }, []);

  const refreshSession = useCallback(async () => {
    const s = await auth.getSession().catch(() => null);
    setSession(s);
    return s;
  }, []);

  const signOut = useCallback(async () => {
    await auth.logout();
    await syncEngine.reset();
    setSession(null);
  }, []);

  const setSyncConsent = useCallback(async (on: boolean) => {
    const r = await api<{ user: unknown }>('/account', { method: 'PATCH', json: { consents: { sync: on } } });
    if (!r.ok) return false;
    if (!on) await syncEngine.reset();
    await refreshSession();
    return true;
  }, [refreshSession]);

  const resetAll = useCallback(async () => {
    await syncEngine.reset();
    await data().clearAll();
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Storage may be unavailable (private mode).
    }
    setSettings(DEFAULT_SETTINGS);
    setSession(null);
    setProfile(null);
    setMessages(STATIC.messages);
    setLibrary(STATIC.library);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      settings,
      updateSettings,
      session,
      setSession,
      refreshSession,
      signOut,
      setSyncConsent,
      syncStatus,
      server,
      profile,
      updateProfile,
      messages,
      library,
      resetAll,
    }),
    [ready, settings, updateSettings, session, refreshSession, signOut, setSyncConsent, syncStatus, server, profile, updateProfile, messages, library, resetAll],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp debe usarse dentro de AppProvider');
  return v;
}
