import type { AuthAdapter } from './AuthAdapter';
import { LocalAuthAdapter } from './LocalAuthAdapter';
import { RemoteAuthAdapter } from './RemoteAuthAdapter';

export * from './AuthAdapter';

const MODE = (import.meta.env.VITE_AUTH_MODE as string | undefined)?.trim();

/** Remote accounts by default; `VITE_AUTH_MODE=local` keeps the phase-1 device-only adapter for offline demos. */
export const auth: AuthAdapter = MODE === 'local' ? new LocalAuthAdapter() : new RemoteAuthAdapter();
