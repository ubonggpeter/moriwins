export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { title, description, linkUrl, isActive } = await request.json();
  await sql`
    UPDATE feature_announcements
    SET
      title = COALESCE(${title ?? null}, title),
      description = COALESCE(${description ?? null}, description),
      link_url = COALESCE(${linkUrl ?? null}, link_url),
      is_active = COALESCE(${isActive ?? null}, is_active)
    WHERE id = ${params.id}
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await sql`DELETE FROM feature_announcements WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
