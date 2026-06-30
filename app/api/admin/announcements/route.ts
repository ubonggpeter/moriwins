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

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const rows = await sql`SELECT * FROM feature_announcements ORDER BY created_at DESC`;
  return NextResponse.json({ announcements: rows });
}

export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { title, description, linkUrl } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });
  const id = uuidv4();
  const [row] = await sql`
    INSERT INTO feature_announcements (id, title, description, link_url)
    VALUES (${id}, ${title.trim()}, ${(description ?? '').trim()}, ${(linkUrl ?? '').trim()})
    RETURNING *
  `;
  return NextResponse.json({ announcement: row }, { status: 201 });
}
