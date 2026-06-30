export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { sql, initSchema } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  await initSchema();

  const token = cookies().get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const courseId = params.id;

  const courseRows = await sql`
    SELECT * FROM courses WHERE id = ${courseId} AND is_active = true
  `;
  if (!courseRows.length) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  const course = courseRows[0];

  const purchaseRows = await sql`
    SELECT * FROM course_purchases WHERE user_id = ${payload.userId} AND course_id = ${courseId}
  `;
  const purchase = purchaseRows.length
    ? { completed: purchaseRows[0].completed, testPassed: purchaseRows[0].test_passed }
    : null;

  let questions = null;
  if (purchase) {
    const qRows = await sql`
      SELECT id, course_id, question_text, options, created_at
      FROM course_questions
      WHERE course_id = ${courseId}
      ORDER BY created_at
    `;
    questions = qRows.map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options as string) : q.options,
    }));
  }

  return NextResponse.json({ course, purchase, questions });
}
