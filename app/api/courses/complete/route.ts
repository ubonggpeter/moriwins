export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { sql, initSchema } from '@/lib/db';

export async function POST(request: Request) {
  await initSchema();

  const token = cookies().get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { courseId } = await request.json();
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 });

  const purchaseRows = await sql`
    SELECT id FROM course_purchases WHERE user_id = ${payload.userId} AND course_id = ${courseId}
  `;
  if (!purchaseRows.length) return NextResponse.json({ error: 'Not purchased' }, { status: 404 });

  await sql`
    UPDATE course_purchases SET completed = true
    WHERE user_id = ${payload.userId} AND course_id = ${courseId}
  `;

  return NextResponse.json({ success: true });
}
