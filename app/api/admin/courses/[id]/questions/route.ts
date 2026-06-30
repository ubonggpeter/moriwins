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

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await sql`
    SELECT * FROM course_questions
    WHERE course_id = ${params.id}
    ORDER BY created_at
  `;
  return NextResponse.json({ questions: rows });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { questionText, options, correctAnswerIndex } = body;

  if (!questionText?.trim()) return NextResponse.json({ error: 'Question text required' }, { status: 400 });
  if (!Array.isArray(options) || options.length !== 4) {
    return NextResponse.json({ error: 'Exactly 4 options required' }, { status: 400 });
  }
  if (correctAnswerIndex === undefined || correctAnswerIndex < 0 || correctAnswerIndex > 3) {
    return NextResponse.json({ error: 'correctAnswerIndex must be 0-3' }, { status: 400 });
  }

  const id = uuidv4();
  const rows = await sql`
    INSERT INTO course_questions (id, course_id, question_text, options, correct_answer_index)
    VALUES (${id}, ${params.id}, ${questionText.trim()}, ${JSON.stringify(options)}, ${correctAnswerIndex})
    RETURNING *
  `;
  return NextResponse.json({ question: rows[0] }, { status: 201 });
}
