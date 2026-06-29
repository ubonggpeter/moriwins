import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';

async function getAdmin() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.userId);
  return user?.isAdmin ? user : null;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  await initSchema();
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { id } = params;

  if (body.isActive !== undefined) {
    await sql`UPDATE recall_texts SET is_active = ${!!body.isActive} WHERE id = ${id}`;
  }
  if (body.title !== undefined || body.textContent !== undefined || body.difficulty !== undefined || body.disappearsAfterReading !== undefined) {
    await sql`
      UPDATE recall_texts SET
        title                    = COALESCE(${body.title ?? null}, title),
        text_content             = COALESCE(${body.textContent ?? null}, text_content),
        difficulty               = COALESCE(${body.difficulty ?? null}, difficulty),
        disappears_after_reading = COALESCE(${body.disappearsAfterReading ?? null}, disappears_after_reading)
      WHERE id = ${id}
    `;
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  await initSchema();
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await sql`DELETE FROM recall_games WHERE text_id = ${params.id}`;
  await sql`DELETE FROM recall_texts WHERE id = ${params.id}`;
  return NextResponse.json({ success: true });
}
