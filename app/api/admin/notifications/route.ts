export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';

async function getAdmin() {
  await initSchema();
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.userId);
  return user?.isAdmin ? user : null;
}

// POST /api/admin/notifications
// body: { title, body, type, target: 'all' | 'user', email? }
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { title, body, type = 'info', target, email } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  if (!['all', 'user'].includes(target)) return NextResponse.json({ error: 'target must be "all" or "user"' }, { status: 400 });

  if (target === 'all') {
    const users = await sql`SELECT id FROM users`;
    if (users.length === 0) return NextResponse.json({ sent: 0 });

    // Insert in batches using individual inserts (PgBouncer safe)
    for (const u of users) {
      await sql`
        INSERT INTO notifications (id, user_id, title, body, type)
        VALUES (${uuidv4()}, ${u.id}, ${title.trim()}, ${(body ?? '').trim()}, ${type})
      `;
    }
    return NextResponse.json({ sent: users.length });
  }

  // target === 'user'
  if (!email?.trim()) return NextResponse.json({ error: 'Email required for user target' }, { status: 400 });
  const rows = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${email.trim()})`;
  if (!rows.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await sql`
    INSERT INTO notifications (id, user_id, title, body, type)
    VALUES (${uuidv4()}, ${rows[0].id}, ${title.trim()}, ${(body ?? '').trim()}, ${type})
  `;
  return NextResponse.json({ sent: 1 });
}
