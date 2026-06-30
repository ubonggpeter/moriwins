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

// PATCH /api/notifications/[id]  { isRead: true }
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { isRead } = await request.json();
  await sql`
    UPDATE notifications
    SET is_read = ${!!isRead}
    WHERE id = ${params.id} AND user_id = ${user.id}
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await sql`DELETE FROM notifications WHERE id = ${params.id} AND user_id = ${user.id}`;
  return NextResponse.json({ ok: true });
}
