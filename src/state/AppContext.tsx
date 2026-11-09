import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_LIBRARY, type LibraryEntry } from '../content/library';
import { DEFAULT_MESSAGES, type ProductMessage } from '../content/messages';
import { auth } from '../lib/auth/LocalAuthAdapter';
import type { Session } from '../lib/auth/AuthAdapter';
import { data } from '../lib/data';
import type { InitialPlan } from '../lib/plan';
import { scheduleDailyReminder } from '../lib/notifications';

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  reducedMotion: boolean;
  onboardingComplete: boolean;
  guest: boolean;
  consents: { memory: boolean; aiSensitive: boolean };
  notifications: { enabled: boolean; time: string };
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
  profile: Profile | null;
  updateProfile: (patch: Partial<Profile>) => Promise<Profile>;
  messages: ProductMessage[];
  saveMessages: (m: ProductMessage[] | null) => Promise<void>;
  library: LibraryEntry[];
  saveLibrary: (l: LibraryEntry[] | null) => Promise<void>;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ProductMessage[]>(DEFAULT_MESSAGES);
  const [library, setLibrary] = useState<LibraryEntry[]>(DEFAULT_LIBRARY);

  useEffect(() => {
    (async () => {
      try {
        const [s, sess, p, m, l] = await Promise.all([
          data().get<Settings>('settings', 'app'),
          auth.getSession(),
          data().get<Profile>('profile', 'me'),
          data().get<ProductMessage[]>('content', 'messages'),
          data().get<LibraryEntry[]>('content', 'library'),
        ]);
        if (s) setSettings({ ...DEFAULT_SETTINGS, ...s, consents: { ...DEFAULT_SETTINGS.consents, ...s.consents } });
        setSession(sess);
        setProfile(p ?? null);
        if (m?.length) setMessages(m);
        if (l?.length) setLibrary(l);
      } catch (err) {
        console.error('No se pudieron cargar los datos locales', err);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    applyTheme(settings);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(settings);
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, [settings]);

  useEffect(() => {
    if (!settings.notifications.enabled) return;
    return scheduleDailyReminder(settings.notifications.time, profile?.reminder || 'Un momento para ti: ¿cómo estás hoy?');
  }, [settings.notifications.enabled, settings.notifications.time, profile?.reminder]);

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

  const saveMessages = useCallback(async (m: ProductMessage[] | null) => {
    if (m === null) {
      await data().remove('content', 'messages');
      setMessages(DEFAULT_MESSAGES);
    } else {
      await data().put('content', 'messages', m);
      setMessages(m);
    }
  }, []);

  const saveLibrary = useCallback(async (l: LibraryEntry[] | null) => {
    if (l === null) {
      await data().remove('content', 'library');
      setLibrary(DEFAULT_LIBRARY);
    } else {
      await data().put('content', 'library', l);
      setLibrary(l);
    }
  }, []);

  const resetAll = useCallback(async () => {
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
    setMessages(DEFAULT_MESSAGES);
    setLibrary(DEFAULT_LIBRARY);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      settings,
      updateSettings,
      session,
      setSession,
      profile,
      updateProfile,
      messages,
      saveMessages,
      library,
      saveLibrary,
      resetAll,
    }),
    [ready, settings, updateSettings, session, profile, updateProfile, messages, saveMessages, library, saveLibrary, resetAll],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp debe usarse dentro de AppProvider');
  return v;
}
