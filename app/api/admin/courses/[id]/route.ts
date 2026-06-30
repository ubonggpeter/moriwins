export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { sql, initSchema, getUserById } from '@/lib/db';

async function getAdmin() {
  await initSchema();
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.userId);
  if (!user?.isAdmin) return null;
  return user;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const courseId = params.id;
  const body = await request.json();
  const { title, description, price, videoUrl, thumbnailUrl, isActive } = body;

  await sql`
    UPDATE courses SET
      title         = COALESCE(${title ?? null}, title),
      description   = COALESCE(${description ?? null}, description),
      price         = COALESCE(${price !== undefined ? Number(price) : null}, price),
      video_url     = COALESCE(${videoUrl ?? null}, video_url),
      thumbnail_url = COALESCE(${thumbnailUrl ?? null}, thumbnail_url),
      is_active     = COALESCE(${isActive !== undefined ? isActive : null}, is_active)
    WHERE id = ${courseId}
  `;
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const courseId = params.id;
  await sql`DELETE FROM course_questions WHERE course_id = ${courseId}`;
  await sql`DELETE FROM course_purchases WHERE course_id = ${courseId}`;
  await sql`DELETE FROM courses WHERE id = ${courseId}`;
  return NextResponse.json({ success: true });
}
