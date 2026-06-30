export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';

async function getAdmin() {
  await initSchema();
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.userId);
  return user?.isAdmin ? user : null;
}

// POST /api/admin/clear-history  { type: 'game' | 'transaction' }
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { type } = await request.json();

  if (type === 'game') {
    await sql`DELETE FROM mines_games`;
    await sql`DELETE FROM memory_games`;
    await sql`DELETE FROM recall_games`;
    return NextResponse.json({ cleared: 'game' });
  }

  if (type === 'transaction') {
    await sql`DELETE FROM withdrawals`;
    await sql`DELETE FROM deposits`;
    return NextResponse.json({ cleared: 'transaction' });
  }

  return NextResponse.json({ error: 'type must be "game" or "transaction"' }, { status: 400 });
}
