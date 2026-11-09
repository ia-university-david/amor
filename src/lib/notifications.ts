/**
 * Local reminders. Notifications are only requested after an explicit tap
 * and only shown while the app (or its service worker) is alive. Reliable
 * delivery when the app is closed needs Web Push, see `PushAdapter`.
 */

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
}

export async function showLocalNotification(title: string, body: string): Promise<void> {
  if (notificationPermission() !== 'granted') return;
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (reg) {
    await reg.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'recordatorio' });
  } else {
    new Notification(title, { body, icon: '/icons/icon-192.png' });
  }
}

/** Milliseconds until the next occurrence of HH:MM in local time. */
export function msUntil(time: string, now = new Date()): number {
  const [h, m] = time.split(':').map(Number);
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

let timer: ReturnType<typeof setTimeout> | null = null;

export function scheduleDailyReminder(time: string, body: string): () => void {
  if (timer) clearTimeout(timer);
  const tick = () => {
    void showLocalNotification('Amor Tóxico', body);
    timer = setTimeout(tick, msUntil(time));
  };
  timer = setTimeout(tick, msUntil(time));
  return () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
}

/** Future server push integration (not implemented in phase 1). */
export interface PushAdapter {
  subscribe(registration: ServiceWorkerRegistration, vapidPublicKey: string): Promise<PushSubscription>;
  unsubscribe(): Promise<void>;
}
