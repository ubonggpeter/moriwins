export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';

async function getUser() {
  await initSchema();
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return getUserById(payload.userId);
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await sql`
    SELECT id, title, body, type, is_read, created_at
    FROM notifications
    WHERE user_id = ${user.id}
    ORDER BY created_at DESC
    LIMIT 50
  `;

  return NextResponse.json({
    notifications: rows.map(r => ({
      id: r.id,
      title: r.title,
      body: r.body,
      type: r.type,
      isRead: r.is_read,
      createdAt: r.created_at,
    })),
    unreadCount: rows.filter(r => !r.is_read).length,
  });
}

// PATCH /api/notifications  { action: 'read-all' }
export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action } = await request.json();
  if (action === 'read-all') {
    await sql`UPDATE notifications SET is_read = true WHERE user_id = ${user.id}`;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
