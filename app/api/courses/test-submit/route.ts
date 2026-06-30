export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { sql, initSchema, getSetting } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  await initSchema();

  const token = cookies().get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { courseId, answers } = await request.json();
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 });

  const purchaseRows = await sql`
    SELECT * FROM course_purchases
    WHERE user_id = ${payload.userId} AND course_id = ${courseId}
  `;
  if (!purchaseRows.length) return NextResponse.json({ error: 'Not purchased' }, { status: 404 });
  if (!purchaseRows[0].completed) {
    return NextResponse.json({ error: 'Must complete course first' }, { status: 400 });
  }

  const questionRows = await sql`
    SELECT * FROM course_questions WHERE course_id = ${courseId} ORDER BY created_at
  `;

  const total = questionRows.length;
  if (total === 0) return NextResponse.json({ error: 'No questions found' }, { status: 400 });

  let correct = 0;
  for (const q of questionRows) {
    const userAnswer = (answers as Record<string, number>)[q.id as string];
    if (userAnswer !== undefined && userAnswer === q.correct_answer_index) {
      correct++;
    }
  }
  const score = Math.round((correct / total) * 100);

  const thresholdStr = await getSetting('learn_pass_threshold', '70');
  const threshold = parseInt(thresholdStr, 10) || 70;
  const passed = score >= threshold;

  let certificateId: string | undefined;

  if (passed) {
    await sql`
      UPDATE course_purchases SET test_passed = true
      WHERE user_id = ${payload.userId} AND course_id = ${courseId}
    `;

    const existingCert = await sql`
      SELECT id FROM certificates WHERE user_id = ${payload.userId} AND course_id = ${courseId}
    `;

    if (!existingCert.length) {
      const certId = uuidv4();
      const certCode = uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();
      await sql`
        INSERT INTO certificates (id, user_id, course_id, certificate_code)
        VALUES (${certId}, ${payload.userId}, ${courseId}, ${certCode})
      `;
      certificateId = certId;
    } else {
      certificateId = existingCert[0].id as string;
    }
  }

  return NextResponse.json({ score, passed, total, correct, certificateId });
}
