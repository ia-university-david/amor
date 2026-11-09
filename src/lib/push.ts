import { api } from './api';

export interface PushPreferences {
  dailyEnabled: boolean;
  dailyTime: string;
  nightEnabled: boolean;
  nightTime: string;
  quietStart: string | null;
  quietEnd: string | null;
  timezone: string;
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iOS only delivers Web Push to PWAs added to the home screen (iOS 16.4+). */
export function iosNeedsInstall(): boolean {
  return isIOS() && !isStandalone();
}

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function subscribePush(publicKey: string): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: 'Tu navegador no admite notificaciones push.' };
  if (iosNeedsInstall()) return { ok: false, error: 'En iPhone y iPad, primero añade la app a tu pantalla de inicio.' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, error: 'Las notificaciones están bloqueadas en tu navegador.' };
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
    } catch {
      return { ok: false, error: 'No se pudo activar en este dispositivo.' };
    }
  }
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const res = await api('/push/subscribe', { json: { endpoint: json.endpoint, keys: json.keys } });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function unsubscribePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await api('/push/unsubscribe', { json: { endpoint: sub.endpoint } });
  await sub.unsubscribe().catch(() => undefined);
}

export async function getPushPreferences() {
  return api<{ devices: number; preferences: PushPreferences }>('/push/preferences');
}

export async function savePushPreferences(p: PushPreferences) {
  return api('/push/preferences', { method: 'PUT', json: p });
}

export async function sendTestPush() {
  return api('/push/test', { json: {} });
}
