export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { sql, initSchema, getUserById } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

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

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await sql`
    SELECT c.*, COUNT(cp.id)::int AS purchase_count
    FROM courses c
    LEFT JOIN course_purchases cp ON cp.course_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;
  return NextResponse.json({ courses: rows });
}

export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { title, description, price, videoUrl, thumbnailUrl } = body;

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  if (price === undefined || price === null || isNaN(Number(price))) {
    return NextResponse.json({ error: 'Price is required' }, { status: 400 });
  }

  const id = uuidv4();
  const rows = await sql`
    INSERT INTO courses (id, title, description, price, video_url, thumbnail_url, created_by)
    VALUES (
      ${id},
      ${title.trim()},
      ${(description ?? '').trim()},
      ${Number(price)},
      ${(videoUrl ?? '').trim()},
      ${(thumbnailUrl ?? '').trim()},
      ${admin.id}
    )
    RETURNING *
  `;
  return NextResponse.json({ course: rows[0] }, { status: 201 });
}
