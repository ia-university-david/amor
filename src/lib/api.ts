/**
 * Same-origin API client. Cookies carry the session (httpOnly), so no token
 * ever touches JavaScript. Network failures resolve to `{ ok: false, status: 0 }`
 * so callers can fall back to offline behaviour.
 */
export const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined)?.trim() || '/api').replace(/\/$/, '');

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  fallback?: boolean;
  /** Parsed error body, e.g. `{ fields: [...] }` from validation errors. */
  details?: unknown;
}

export async function api<T = unknown>(path: string, init: { method?: string; json?: unknown; signal?: AbortSignal } = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(API_BASE + path, {
      method: init.method ?? (init.json !== undefined ? 'POST' : 'GET'),
      credentials: 'include',
      headers: init.json !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
      signal: init.signal,
    });
    const type = res.headers.get('content-type') ?? '';
    const body = type.includes('application/json') ? await res.json().catch(() => null) : null;
    if (!res.ok) {
      return { ok: false, status: res.status, data: null, error: (body as { error?: string } | null)?.error ?? errorFor(res.status), fallback: (body as { fallback?: boolean } | null)?.fallback, details: body };
    }
    return { ok: true, status: res.status, data: body as T };
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    return { ok: false, status: 0, data: null, error: 'No hay conexión con el servidor. Tus herramientas locales siguen funcionando.' };
  }
}

function errorFor(status: number): string {
  if (status === 401) return 'Necesitas iniciar sesión.';
  if (status === 403) return 'No tienes permiso para esto.';
  if (status === 404) return 'No encontrado.';
  if (status === 429) return 'Demasiadas solicitudes seguidas. Espera un momento.';
  return 'Algo salió mal. Inténtalo de nuevo.';
}

export interface ServerConfig {
  online: boolean;
  auth: { password: boolean; magicLink: boolean; google: boolean; apple: boolean };
  assistant: { llm: boolean };
  billing: { enabled: boolean };
  push: { enabled: boolean; publicKey: string | null };
  community: { requireVerified: boolean };
  devMailbox: boolean;
}

export const OFFLINE_CONFIG: ServerConfig = {
  online: false,
  auth: { password: false, magicLink: false, google: false, apple: false },
  assistant: { llm: false },
  billing: { enabled: false },
  push: { enabled: false, publicKey: null },
  community: { requireVerified: true },
  devMailbox: false,
};

let configPromise: Promise<ServerConfig> | null = null;

export function getServerConfig(force = false): Promise<ServerConfig> {
  if (!configPromise || force) {
    configPromise = api<Omit<ServerConfig, 'online'>>('/config').then((r) => (r.ok && r.data ? { ...r.data, online: true } : OFFLINE_CONFIG));
  }
  return configPromise;
}
