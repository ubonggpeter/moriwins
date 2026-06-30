export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, initSchema, sql } from '@/lib/db';

export async function POST(request: Request) {
  await initSchema();
  const token = cookies().get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getUserById(payload.userId);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gameSessionId, gameType, triggerType, actionTaken, deductAmount } = await request.json();
  if (!gameSessionId || !gameType || !triggerType || !actionTaken) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  let newBalance: number | undefined;
  const deduct = Math.max(0, Math.floor(Number(deductAmount) || 0));

  if (deduct > 0) {
    const rows = await sql`
      UPDATE users
      SET balance = GREATEST(0, balance - ${deduct})
      WHERE id = ${user.id}
      RETURNING balance
    `;
    newBalance = Number(rows[0]?.balance ?? user.balance);
  }

  await sql`
    INSERT INTO malpractice_logs (user_id, game_session_id, game_type, trigger_type, action_taken)
    VALUES (${user.id}, ${String(gameSessionId)}, ${String(gameType)}, ${String(triggerType)}, ${String(actionTaken)})
  `;

  return NextResponse.json({ success: true, ...(newBalance !== undefined ? { newBalance, deducted: deduct } : {}) });
}
