import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, setSetting, initSchema } from '@/lib/db';

async function getAdmin() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.userId);
  return user?.isAdmin ? user : null;
}

export async function PATCH(request: Request) {
  await initSchema();
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { game, muted } = await request.json();
  if (!['mines', 'memory'].includes(game) || typeof muted !== 'boolean') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  await setSetting(`game_muted_${game}`, muted ? 'true' : 'false');
  return NextResponse.json({ success: true });
}
