import postgres from 'postgres';
import type { User } from './types';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// prepare: false is required for Supabase connection pooler (PgBouncer transaction mode)
export const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: 'require',
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});

let schemaInitialized = false;

export async function initSchema(): Promise<void> {
  if (schemaInitialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID        PRIMARY KEY,
      username    TEXT        UNIQUE NOT NULL,
      email       TEXT        UNIQUE NOT NULL,
      password_hash TEXT      NOT NULL,
      balance     INTEGER     NOT NULL DEFAULT 1000,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  schemaInitialized = true;
}

// ── User helpers ────────────────────────────────────────────────────────────

function rowToUser(r: Record<string, unknown>): User {
  return {
    id: r.id as string,
    username: r.username as string,
    email: r.email as string,
    passwordHash: r.password_hash as string,
    balance: r.balance as number,
    createdAt: (r.created_at as Date).toISOString(),
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

export async function createUser(user: User): Promise<User> {
  await initSchema();
  await sql`
    INSERT INTO users (id, username, email, password_hash, balance, created_at)
    VALUES (${user.id}, ${user.username}, ${user.email}, ${user.passwordHash}, ${user.balance}, ${user.createdAt})
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
