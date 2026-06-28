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

  const { balance, isAdmin } = await request.json();

  if (balance !== undefined) {
    await sql`UPDATE users SET balance = ${Math.max(0, Math.floor(balance))} WHERE id = ${params.id}`;
  }
  if (isAdmin !== undefined) {
    await sql`UPDATE users SET is_admin = ${Boolean(isAdmin)} WHERE id = ${params.id}`;
  }

  return NextResponse.json({ success: true });
}
