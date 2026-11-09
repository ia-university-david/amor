import type { Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

/**
 * Migrations are defined inline (not read from disk) so they survive bundling.
 * Never edit a migration that has shipped: add a new one.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = Kysely<any>;

export const migrations: Record<string, Migration> = {
  '0001_initial': {
    async up(db: DB) {
      await db.schema
        .createTable('users')
        .addColumn('id', 'text', (c) => c.primaryKey())
        .addColumn('email', 'text', (c) => c.notNull().unique())
        .addColumn('email_verified_at', 'text')
        .addColumn('password_hash', 'text')
        .addColumn('name', 'text', (c) => c.notNull())
        .addColumn('role', 'text', (c) => c.notNull().defaultTo('user'))
        .addColumn('adult_confirmed_at', 'text')
        .addColumn('consents', 'text', (c) => c.notNull().defaultTo('{}'))
        .addColumn('plan', 'text', (c) => c.notNull().defaultTo('free'))
        .addColumn('stripe_customer_id', 'text')
        .addColumn('subscription_status', 'text')
        .addColumn('subscription_period_end', 'text')
        .addColumn('created_at', 'text', (c) => c.notNull())
        .addColumn('updated_at', 'text', (c) => c.notNull())
        .execute();

      await db.schema
        .createTable('oauth_accounts')
        .addColumn('provider', 'text', (c) => c.notNull())
        .addColumn('provider_user_id', 'text', (c) => c.notNull())
        .addColumn('user_id', 'text', (c) => c.notNull().references('users.id').onDelete('cascade'))
        .addColumn('created_at', 'text', (c) => c.notNull())
        .addPrimaryKeyConstraint('oauth_accounts_pk', ['provider', 'provider_user_id'])
        .execute();

      await db.schema
        .createTable('sessions')
        .addColumn('id', 'text', (c) => c.primaryKey())
        .addColumn('user_id', 'text', (c) => c.notNull().references('users.id').onDelete('cascade'))
        .addColumn('created_at', 'text', (c) => c.notNull())
        .addColumn('expires_at', 'text', (c) => c.notNull())
        .addColumn('last_seen_at', 'text', (c) => c.notNull())
        .execute();
      await db.schema.createIndex('sessions_user_idx').on('sessions').column('user_id').execute();

      await db.schema
        .createTable('auth_tokens')
        .addColumn('id', 'text', (c) => c.primaryKey())
        .addColumn('kind', 'text', (c) => c.notNull())
        .addColumn('user_id', 'text', (c) => c.references('users.id').onDelete('cascade'))
        .addColumn('email', 'text', (c) => c.notNull())
        .addColumn('data', 'text')
        .addColumn('expires_at', 'text', (c) => c.notNull())
        .addColumn('used_at', 'text')
        .addColumn('created_at', 'text', (c) => c.notNull())
        .execute();

      await db.schema
        .createTable('sync_docs')
        .addColumn('user_id', 'text', (c) => c.notNull().references('users.id').onDelete('cascade'))
        .addColumn('collection', 'text', (c) => c.notNull())
        .addColumn('doc_id', 'text', (c) => c.notNull())
        .addColumn('payload', 'text')
        .addColumn('deleted', 'integer', (c) => c.notNull().defaultTo(0))
        .addColumn('updated_at', 'text', (c) => c.notNull())
        .addPrimaryKeyConstraint('sync_docs_pk', ['user_id', 'collection', 'doc_id'])
        .execute();

      await db.schema
        .createTable('backups')
        .addColumn('user_id', 'text', (c) => c.primaryKey().references('users.id').onDelete('cascade'))
        .addColumn('ciphertext', 'text', (c) => c.notNull())
        .addColumn('iv', 'text', (c) => c.notNull())
        .addColumn('salt', 'text', (c) => c.notNull())
        .addColumn('kdf', 'text', (c) => c.notNull())
        .addColumn('iterations', 'integer', (c) => c.notNull())
        .addColumn('size', 'integer', (c) => c.notNull())
        .addColumn('updated_at', 'text', (c) => c.notNull())
        .execute();

      await db.schema
        .createTable('assistant_usage')
        .addColumn('user_id', 'text', (c) => c.notNull().references('users.id').onDelete('cascade'))
        .addColumn('day', 'text', (c) => c.notNull())
        .addColumn('count', 'integer', (c) => c.notNull().defaultTo(0))
        .addPrimaryKeyConstraint('assistant_usage_pk', ['user_id', 'day'])
        .execute();

      await db.schema
        .createTable('community_profiles')
        .addColumn('user_id', 'text', (c) => c.primaryKey().references('users.id').onDelete('cascade'))
        .addColumn('pseudonym', 'text', (c) => c.notNull().unique())
        .addColumn('muted_until', 'text')
        .addColumn('created_at', 'text', (c) => c.notNull())
        .execute();

      await db.schema
        .createTable('community_rooms')
        .addColumn('id', 'text', (c) => c.primaryKey())
        .addColumn('name', 'text', (c) => c.notNull())
        .addColumn('description', 'text', (c) => c.notNull())
        .addColumn('sort', 'integer', (c) => c.notNull().defaultTo(0))
        .addColumn('locked', 'integer', (c) => c.notNull().defaultTo(0))
        .execute();

      await db.schema
        .createTable('community_posts')
        .addColumn('id', 'text', (c) => c.primaryKey())
        .addColumn('room_id', 'text', (c) => c.notNull().references('community_rooms.id'))
        .addColumn('author_id', 'text', (c) => c.references('users.id').onDelete('set null'))
        .addColumn('pseudonym', 'text', (c) => c.notNull())
        .addColumn('parent_id', 'text')
        .addColumn('body', 'text', (c) => c.notNull())
        .addColumn('status', 'text', (c) => c.notNull())
        .addColumn('flags', 'text', (c) => c.notNull().defaultTo('[]'))
        .addColumn('created_at', 'text', (c) => c.notNull())
        .addColumn('updated_at', 'text', (c) => c.notNull())
        .execute();
      await db.schema.createIndex('posts_room_idx').on('community_posts').columns(['room_id', 'parent_id', 'created_at']).execute();
      await db.schema.createIndex('posts_status_idx').on('community_posts').column('status').execute();

      await db.schema
        .createTable('community_reactions')
        .addColumn('post_id', 'text', (c) => c.notNull().references('community_posts.id').onDelete('cascade'))
        .addColumn('user_id', 'text', (c) => c.notNull().references('users.id').onDelete('cascade'))
        .addColumn('kind', 'text', (c) => c.notNull())
        .addColumn('created_at', 'text', (c) => c.notNull())
        .addPrimaryKeyConstraint('reactions_pk', ['post_id', 'user_id', 'kind'])
        .execute();

      await db.schema
        .createTable('community_reports')
        .addColumn('id', 'text', (c) => c.primaryKey())
        .addColumn('post_id', 'text', (c) => c.notNull().references('community_posts.id').onDelete('cascade'))
        .addColumn('reporter_id', 'text', (c) => c.references('users.id').onDelete('set null'))
        .addColumn('reason', 'text', (c) => c.notNull())
        .addColumn('details', 'text')
        .addColumn('status', 'text', (c) => c.notNull().defaultTo('open'))
        .addColumn('created_at', 'text', (c) => c.notNull())
        .addColumn('resolved_by', 'text')
        .addColumn('resolved_at', 'text')
        .execute();

      await db.schema
        .createTable('push_subscriptions')
        .addColumn('id', 'text', (c) => c.primaryKey())
        .addColumn('user_id', 'text', (c) => c.notNull().references('users.id').onDelete('cascade'))
        .addColumn('endpoint', 'text', (c) => c.notNull())
        .addColumn('p256dh', 'text', (c) => c.notNull())
        .addColumn('auth', 'text', (c) => c.notNull())
        .addColumn('created_at', 'text', (c) => c.notNull())
        .execute();

      await db.schema
        .createTable('reminder_prefs')
        .addColumn('user_id', 'text', (c) => c.primaryKey().references('users.id').onDelete('cascade'))
        .addColumn('daily_enabled', 'integer', (c) => c.notNull().defaultTo(0))
        .addColumn('daily_time', 'text', (c) => c.notNull().defaultTo('21:00'))
        .addColumn('night_enabled', 'integer', (c) => c.notNull().defaultTo(0))
        .addColumn('night_time', 'text', (c) => c.notNull().defaultTo('22:30'))
        .addColumn('quiet_start', 'text')
        .addColumn('quiet_end', 'text')
        .addColumn('timezone', 'text', (c) => c.notNull().defaultTo('UTC'))
        .addColumn('last_daily_sent', 'text')
        .addColumn('last_night_sent', 'text')
        .addColumn('updated_at', 'text', (c) => c.notNull())
        .execute();

      await db.schema
        .createTable('content_items')
        .addColumn('id', 'text', (c) => c.primaryKey())
        .addColumn('type', 'text', (c) => c.notNull())
        .addColumn('slug', 'text', (c) => c.notNull())
        .addColumn('title', 'text', (c) => c.notNull())
        .addColumn('status', 'text', (c) => c.notNull())
        .addColumn('data', 'text', (c) => c.notNull())
        .addColumn('sort', 'integer', (c) => c.notNull().defaultTo(0))
        .addColumn('updated_at', 'text', (c) => c.notNull())
        .addColumn('updated_by', 'text')
        .addUniqueConstraint('content_type_slug_uq', ['type', 'slug'])
        .execute();

      await db.schema
        .createTable('leads')
        .addColumn('id', 'text', (c) => c.primaryKey())
        .addColumn('kind', 'text', (c) => c.notNull())
        .addColumn('name', 'text', (c) => c.notNull())
        .addColumn('email', 'text', (c) => c.notNull())
        .addColumn('message', 'text')
        .addColumn('consent', 'integer', (c) => c.notNull())
        .addColumn('status', 'text', (c) => c.notNull())
        .addColumn('created_at', 'text', (c) => c.notNull())
        .addColumn('confirmed_at', 'text')
        .execute();

      await db.schema
        .createTable('audit_log')
        .addColumn('id', 'text', (c) => c.primaryKey())
        .addColumn('actor_id', 'text')
        .addColumn('action', 'text', (c) => c.notNull())
        .addColumn('target', 'text', (c) => c.notNull())
        .addColumn('at', 'text', (c) => c.notNull())
        .execute();

      await db.schema
        .createTable('metrics_daily')
        .addColumn('day', 'text', (c) => c.notNull())
        .addColumn('name', 'text', (c) => c.notNull())
        .addColumn('count', 'integer', (c) => c.notNull().defaultTo(0))
        .addPrimaryKeyConstraint('metrics_daily_pk', ['day', 'name'])
        .execute();

      await db.schema
        .createTable('stripe_events')
        .addColumn('id', 'text', (c) => c.primaryKey())
        .addColumn('type', 'text', (c) => c.notNull())
        .addColumn('received_at', 'text', (c) => c.notNull())
        .execute();
    },
    async down(db: DB) {
      for (const t of [
        'stripe_events', 'metrics_daily', 'audit_log', 'leads', 'content_items', 'reminder_prefs', 'push_subscriptions',
        'community_reports', 'community_reactions', 'community_posts', 'community_rooms', 'community_profiles',
        'assistant_usage', 'backups', 'sync_docs', 'auth_tokens', 'sessions', 'oauth_accounts', 'users',
      ]) {
        await db.schema.dropTable(t).ifExists().execute();
      }
    },
  },
};
