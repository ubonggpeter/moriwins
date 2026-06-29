import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';
import { DIFFICULTIES } from '@/lib/recall';

async function getAdmin() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.userId);
  return user?.isAdmin ? user : null;
}

export async function GET() {
  await initSchema();
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const texts = await sql`SELECT * FROM recall_texts ORDER BY created_at DESC`;
  return NextResponse.json({ texts });
}

export async function POST(request: Request) {
  await initSchema();
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { title, textContent, difficulty, disappearsAfterReading } = await request.json();
  if (!title || !textContent) {
    return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
  }
  if (!DIFFICULTIES.includes(difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
  }

  const id = uuidv4();
  await sql`
    INSERT INTO recall_texts (id, title, text_content, difficulty, disappears_after_reading)
    VALUES (${id}, ${title}, ${textContent}, ${difficulty}, ${!!disappearsAfterReading})
  `;
  return NextResponse.json({ success: true, id });
}
