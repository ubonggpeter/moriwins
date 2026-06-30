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

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; qid: string } }
) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await sql`
    DELETE FROM course_questions
    WHERE id = ${params.qid} AND course_id = ${params.id}
  `;
  return NextResponse.json({ success: true });
}
