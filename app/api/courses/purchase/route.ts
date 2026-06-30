export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { sql, initSchema } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  await initSchema();

  const token = cookies().get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { courseId } = await request.json();
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 });

  const courseRows = await sql`
    SELECT * FROM courses WHERE id = ${courseId} AND is_active = true
  `;
  if (!courseRows.length) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  const course = courseRows[0];

  const existing = await sql`
    SELECT id FROM course_purchases WHERE user_id = ${payload.userId} AND course_id = ${courseId}
  `;
  if (existing.length) return NextResponse.json({ error: 'Already purchased' }, { status: 409 });

  const price = Number(course.price);

  const userRows = await sql`SELECT balance FROM users WHERE id = ${payload.userId}`;
  if (!userRows.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const balance = Number(userRows[0].balance);

  if (balance < price) return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });

  const purchaseId = uuidv4();

  await sql.begin(async (tx) => {
    await tx`
      UPDATE users SET balance = balance - ${price} WHERE id = ${payload.userId}
    `;
    await tx`
      INSERT INTO course_purchases (id, user_id, course_id)
      VALUES (${purchaseId}, ${payload.userId}, ${courseId})
    `;
  });

  const updatedUser = await sql`SELECT balance FROM users WHERE id = ${payload.userId}`;
  return NextResponse.json({ balance: Number(updatedUser[0].balance), purchaseId });
}
