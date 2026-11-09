import { buildDeps, createApp, type DepOverrides } from '../../server/app';
import { loadConfig } from '../../server/config';
import type { Deps } from '../../server/context';
import { silentLogger } from '../../server/logger';
import { MemoryTransport } from '../../server/services/email';

export const ORIGIN = 'http://localhost:5173';

export interface TestApp {
  deps: Deps;
  mail: MemoryTransport;
  app: ReturnType<typeof createApp>;
  client(): TestClient;
}

export interface TestClient {
  cookie: string;
  req(path: string, init?: { method?: string; json?: unknown; headers?: Record<string, string>; body?: string }): Promise<Response>;
  json<T = Record<string, unknown>>(path: string, init?: { method?: string; json?: unknown }): Promise<{ status: number; body: T }>;
}

/**
 * With TEST_PG_URL (e.g. postgres://amor:amor@localhost/amor) every test app
 * gets its own fresh Postgres database, so the suite also validates Postgres.
 */
async function testDatabaseUrl(): Promise<string> {
  const admin = process.env.TEST_PG_URL;
  if (!admin) return 'sqlite::memory:';
  const { default: pg } = await import('pg');
  const name = `amor_test_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const client = new pg.Client({ connectionString: admin });
  await client.connect();
  await client.query(`CREATE DATABASE ${name}`);
  await client.end();
  const url = new URL(admin);
  url.pathname = `/${name}`;
  return url.toString();
}

export async function makeTestApp(env: Record<string, string> = {}, overrides: DepOverrides = {}): Promise<TestApp> {
  const config = loadConfig({ NODE_ENV: 'test', DATABASE_URL: await testDatabaseUrl(), EMAIL_TRANSPORT: 'memory', APP_URL: ORIGIN, ...env });
  const mail = new MemoryTransport();
  const deps = await buildDeps(config, { log: silentLogger, transport: mail, llm: null, ...overrides });
  const app = createApp(deps);
  return {
    deps,
    mail,
    app,
    client() {
      const c: TestClient = {
        cookie: '',
        async req(path, init = {}) {
          const headers: Record<string, string> = { Origin: ORIGIN, ...(init.headers ?? {}) };
          if (c.cookie) headers.Cookie = c.cookie;
          let body = init.body;
          if (init.json !== undefined) {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(init.json);
          }
          const res = await app.request(path, { method: init.method ?? (body ? 'POST' : 'GET'), headers, body });
          const set = res.headers.get('set-cookie');
          if (set) {
            const m = /amor_sid=([^;]*)/.exec(set);
            if (m) c.cookie = m[1] ? `amor_sid=${m[1]}` : '';
          }
          return res;
        },
        async json(path, init) {
          const res = await c.req(path, init);
          const text = await res.text();
          return { status: res.status, body: (text ? JSON.parse(text) : {}) as never };
        },
      };
      return c;
    },
  };
}

export function tokenFrom(mail: MemoryTransport, kind: string): string {
  const msg = mail.sent.find((m) => m.kind === kind);
  if (!msg) throw new Error(`No hay correo ${kind}`);
  const m = /token=([A-Za-z0-9_-]+)/.exec(msg.text);
  if (!m) throw new Error('Sin token');
  return decodeURIComponent(m[1]);
}

export async function registered(t: TestApp, email = 'ana@example.com', opts: { verify?: boolean; sync?: boolean } = {}) {
  const c = t.client();
  const res = await c.json<{ user: { id: string } }>('/api/auth/register', {
    json: { name: 'Ana', email, password: 'contraseña-segura', adultConfirmed: true, consents: { sync: opts.sync ?? false } },
  });
  if (res.status !== 201) throw new Error(`registro falló ${res.status}`);
  if (opts.verify) {
    const token = tokenFrom(t.mail, 'verify');
    t.mail.sent.length = 0;
    await c.json('/api/auth/verify-email', { json: { token } });
  }
  return { c, id: res.body.user.id };
}

export async function setRole(t: TestApp, id: string, role: string) {
  await t.deps.db.updateTable('users').set({ role }).where('id', '=', id).execute();
}

/** Reads a text/event-stream response into [{event, data}] */
export async function readSSE(res: Response): Promise<{ event: string; data: Record<string, unknown> }[]> {
  const text = await res.text();
  return text
    .split('\n\n')
    .filter((b) => b.trim())
    .map((block) => {
      const event = /^event: (.*)$/m.exec(block)?.[1] ?? 'message';
      const data = block
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim())
        .join('\n');
      return { event, data: data ? JSON.parse(data) : {} };
    });
}
