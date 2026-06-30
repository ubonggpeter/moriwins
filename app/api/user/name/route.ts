export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';

export async function PATCH(request: Request) {
  await initSchema();
  const token = cookies().get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const user = await getUserById(payload.userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { fullName } = await request.json();
  const trimmed = (fullName ?? '').trim().slice(0, 100);

  await sql`UPDATE users SET full_name = ${trimmed} WHERE id = ${user.id}`;

  return NextResponse.json({ fullName: trimmed });
}
