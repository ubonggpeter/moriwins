import postgres from 'postgres';
import type { User } from './types';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

/**
 * The `postgres` package parses connection strings with the URL constructor,
 * which treats `#` as a fragment delimiter — truncating any password that
 * contains `#` (e.g. `#UBCEO_12as#` becomes an empty string).
 *
 * Fix: percent-encode bare `#` characters in the credentials section
 * (everything before the last `@`) without double-encoding already-encoded
 * values (which contain `%`, not `#`).
 */
function encodeConnectionString(url: string): string {
  const lastAt = url.lastIndexOf('@');
  if (lastAt === -1) return url;
  const credentials = url.slice(0, lastAt);  // postgresql://user:pass
  const hostPart    = url.slice(lastAt);      // @host:port/db
  return credentials.replace(/#/g, '%23') + hostPart;
}

// prepare: false is required for Supabase connection pooler (PgBouncer transaction mode)
export const sql = postgres(encodeConnectionString(process.env.DATABASE_URL), {
  prepare: false,
  ssl: 'require',
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});

let schemaInitialized = false;

export async function initSchema(): Promise<void> {
  if (schemaInitialized) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID        PRIMARY KEY,
        username      TEXT        UNIQUE NOT NULL,
        email         TEXT        UNIQUE NOT NULL,
        password_hash TEXT        NOT NULL,
        balance       INTEGER     NOT NULL DEFAULT 1000,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS mines_games (
        id            UUID        PRIMARY KEY,
        user_id       UUID        NOT NULL REFERENCES users(id),
        grid          JSONB       NOT NULL,
        revealed      JSONB       NOT NULL,
        bet           INTEGER     NOT NULL,
        mine_count    INTEGER     NOT NULL,
        status        TEXT        NOT NULL DEFAULT 'active',
        revealed_safe INTEGER     NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS memory_games (
        id            UUID        PRIMARY KEY,
        user_id       UUID        NOT NULL REFERENCES users(id),
        bet           INTEGER     NOT NULL,
        status        TEXT        NOT NULL DEFAULT 'active',
        wrong_guesses INTEGER     NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // New columns on users — each wrapped individually so failures are non-fatal
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE`; } catch {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT`; } catch {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID`; } catch {}
    // Backfill any users missing a 6-char code (old codes were 8-char base36 or username-based)
    try {
      await sql`
        UPDATE users
        SET referral_code = UPPER(ENCODE(GEN_RANDOM_BYTES(3), 'hex'))
        WHERE referral_code IS NULL OR LENGTH(referral_code) != 6
      `;
    } catch {}
    try {
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_unique ON users(referral_code) WHERE referral_code IS NOT NULL`;
    } catch {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_earnings INTEGER NOT NULL DEFAULT 0`; } catch {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_game_winnings INTEGER NOT NULL DEFAULT 0`; } catch {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`; } catch {}

    await sql`
      CREATE TABLE IF NOT EXISTS referrals (
        id          UUID        PRIMARY KEY,
        referrer_id UUID        NOT NULL REFERENCES users(id),
        referred_id UUID        NOT NULL UNIQUE REFERENCES users(id),
        bonus_paid  INTEGER     NOT NULL DEFAULT 50,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id             UUID        PRIMARY KEY,
        user_id        UUID        NOT NULL REFERENCES users(id),
        bank_name      TEXT        NOT NULL,
        account_number TEXT        NOT NULL,
        account_name   TEXT        NOT NULL,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id              UUID        PRIMARY KEY,
        user_id         UUID        NOT NULL REFERENCES users(id),
        amount          INTEGER     NOT NULL,
        bank_account_id UUID        NOT NULL REFERENCES bank_accounts(id),
        status          TEXT        NOT NULL DEFAULT 'pending',
        admin_note      TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS app_settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`INSERT INTO app_settings (key, value) VALUES ('withdrawal_threshold', '10000') ON CONFLICT (key) DO NOTHING`;
    await sql`INSERT INTO app_settings (key, value) VALUES ('deposit_info', '[]') ON CONFLICT (key) DO NOTHING`;
    await sql`INSERT INTO app_settings (key, value) VALUES ('leaderboard_min_earnings', '0') ON CONFLICT (key) DO NOTHING`;
    await sql`INSERT INTO app_settings (key, value) VALUES ('game_muted_mines', 'false') ON CONFLICT (key) DO NOTHING`;
    await sql`INSERT INTO app_settings (key, value) VALUES ('game_muted_memory', 'false') ON CONFLICT (key) DO NOTHING`;

    schemaInitialized = true;
  } catch (err) {
    console.error('[db] initSchema failed — check DATABASE_URL and Supabase connectivity:', err);
    throw err;
  }
}

// ── User helpers ────────────────────────────────────────────────────────────

function rowToUser(r: Record<string, unknown>): User {
  return {
    id: r.id as string,
    username: r.username as string,
    email: r.email as string,
    passwordHash: r.password_hash as string,
    balance: Number(r.balance),
    createdAt: (r.created_at as Date).toISOString(),
    isAdmin: r.is_admin === true || r.is_admin === 1,
    referralCode: (r.referral_code as string) ?? '',
    referredBy: (r.referred_by as string) ?? null,
    referralEarnings: Number(r.referral_earnings ?? 0),
    totalGameWinnings: Number(r.total_game_winnings ?? 0),
    avatarUrl: (r.avatar_url as string | null) ?? null,
  };
}

export async function getUserById(id: string): Promise<User | null> {
  await initSchema();
  const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
  return rows.length ? rowToUser(rows[0]) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  await initSchema();
  const rows = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email})`;
  return rows.length ? rowToUser(rows[0]) : null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  await initSchema();
  const rows = await sql`SELECT * FROM users WHERE LOWER(username) = LOWER(${username})`;
  return rows.length ? rowToUser(rows[0]) : null;
}

export async function getUserByReferralCode(code: string): Promise<User | null> {
  await initSchema();
  const rows = await sql`SELECT * FROM users WHERE referral_code = ${code}`;
  return rows.length ? rowToUser(rows[0]) : null;
}

export async function createUser(user: User): Promise<User> {
  await initSchema();
  await sql`
    INSERT INTO users (id, username, email, password_hash, balance, created_at, referral_code)
    VALUES (${user.id}, ${user.username}, ${user.email}, ${user.passwordHash}, ${user.balance}, ${user.createdAt}, ${user.referralCode})
  `;
  return user;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  await initSchema();
  const rows = await sql`
    UPDATE users
    SET balance = COALESCE(${updates.balance ?? null}, balance)
    WHERE id = ${id}
    RETURNING *
  `;
  return rows.length ? rowToUser(rows[0]) : null;
}

// ── Settings helpers ─────────────────────────────────────────────────────────

export async function getSetting(key: string, defaultValue = ''): Promise<string> {
  await initSchema();
  const rows = await sql`SELECT value FROM app_settings WHERE key = ${key}`;
  return rows.length ? (rows[0].value as string) : defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await initSchema();
  await sql`
    INSERT INTO app_settings (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
  `;
}
