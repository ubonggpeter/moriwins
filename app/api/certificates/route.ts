export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { sql, initSchema } from '@/lib/db';

export async function GET() {
  await initSchema();

  const token = cookies().get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await sql`
    SELECT cert.*, c.title AS course_title, c.description AS course_description
    FROM certificates cert
    JOIN courses c ON c.id = cert.course_id
    WHERE cert.user_id = ${payload.userId}
    ORDER BY cert.issued_at DESC
  `;

  return NextResponse.json({ certificates: rows });
}
