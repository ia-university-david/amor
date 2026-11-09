/**
 * Table types. Column types are deliberately portable between SQLite and
 * Postgres: text (ISO dates, JSON as text) and integers (booleans as 0/1).
 */
export interface UsersTable {
  id: string;
  email: string;
  email_verified_at: string | null;
  password_hash: string | null;
  name: string;
  role: string;
  adult_confirmed_at: string | null;
  consents: string;
  plan: string;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  subscription_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface OAuthAccountsTable {
  provider: string;
  provider_user_id: string;
  user_id: string;
  created_at: string;
}

export interface SessionsTable {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
}

export interface AuthTokensTable {
  id: string;
  kind: string;
  user_id: string | null;
  email: string;
  data: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface SyncDocsTable {
  user_id: string;
  collection: string;
  doc_id: string;
  payload: string | null;
  deleted: number;
  updated_at: string;
}

export interface BackupsTable {
  user_id: string;
  ciphertext: string;
  iv: string;
  salt: string;
  kdf: string;
  iterations: number;
  size: number;
  updated_at: string;
}

export interface AssistantUsageTable {
  user_id: string;
  day: string;
  count: number;
}

export interface CommunityProfilesTable {
  user_id: string;
  pseudonym: string;
  muted_until: string | null;
  created_at: string;
}

export interface CommunityRoomsTable {
  id: string;
  name: string;
  description: string;
  sort: number;
  locked: number;
}

export interface CommunityPostsTable {
  id: string;
  room_id: string;
  author_id: string | null;
  pseudonym: string;
  parent_id: string | null;
  body: string;
  status: string;
  flags: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityReactionsTable {
  post_id: string;
  user_id: string;
  kind: string;
  created_at: string;
}

export interface CommunityReportsTable {
  id: string;
  post_id: string;
  reporter_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
}

export interface PushSubscriptionsTable {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface ReminderPrefsTable {
  user_id: string;
  daily_enabled: number;
  daily_time: string;
  night_enabled: number;
  night_time: string;
  quiet_start: string | null;
  quiet_end: string | null;
  timezone: string;
  last_daily_sent: string | null;
  last_night_sent: string | null;
  updated_at: string;
}

export interface ContentItemsTable {
  id: string;
  type: string;
  slug: string;
  title: string;
  status: string;
  data: string;
  sort: number;
  updated_at: string;
  updated_by: string | null;
}

export interface LeadsTable {
  id: string;
  kind: string;
  name: string;
  email: string;
  message: string | null;
  consent: number;
  status: string;
  created_at: string;
  confirmed_at: string | null;
}

export interface AuditLogTable {
  id: string;
  actor_id: string | null;
  action: string;
  target: string;
  at: string;
}

export interface MetricsDailyTable {
  day: string;
  name: string;
  count: number;
}

export interface StripeEventsTable {
  id: string;
  type: string;
  received_at: string;
}

export interface Database {
  users: UsersTable;
  oauth_accounts: OAuthAccountsTable;
  sessions: SessionsTable;
  auth_tokens: AuthTokensTable;
  sync_docs: SyncDocsTable;
  backups: BackupsTable;
  assistant_usage: AssistantUsageTable;
  community_profiles: CommunityProfilesTable;
  community_rooms: CommunityRoomsTable;
  community_posts: CommunityPostsTable;
  community_reactions: CommunityReactionsTable;
  community_reports: CommunityReportsTable;
  push_subscriptions: PushSubscriptionsTable;
  reminder_prefs: ReminderPrefsTable;
  content_items: ContentItemsTable;
  leads: LeadsTable;
  audit_log: AuditLogTable;
  metrics_daily: MetricsDailyTable;
  stripe_events: StripeEventsTable;
}
