/**
 * Assigns a team role to an existing account:
 *   npm run role -- persona@correo.com admin|editor|moderador|user
 * Uses DATABASE_URL (and .env when present), like the server.
 */
import { existsSync } from 'node:fs';
import { createDb, migrate } from '../server/db';
import { ROLES, type Role } from '../server/context';
import { normalizeEmail, now } from '../server/util';

if (existsSync('.env')) process.loadEnvFile('.env');

const [email, role] = process.argv.slice(2);
if (!email || !role || !(ROLES as readonly string[]).includes(role)) {
  console.error(`Uso: npm run role -- correo@ejemplo.com ${ROLES.join('|')}`);
  process.exit(1);
}

const db = await createDb(process.env.DATABASE_URL ?? 'sqlite:./data/amor.db');
await migrate(db);
const res = await db
  .updateTable('users')
  .set({ role: role as Role, updated_at: now() })
  .where('email', '=', normalizeEmail(email))
  .executeTakeFirst();
await db.destroy();
if (!Number(res.numUpdatedRows)) {
  console.error(`No existe una cuenta con el correo ${email}. Primero regístrate en la app.`);
  process.exit(1);
}
console.log(`Listo: ${email} ahora tiene el rol «${role}».`);
