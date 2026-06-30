export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, initSchema, sql } from '@/lib/db';

async function getAdminOrSubAdmin() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.userId);
  if (!user) return null;
  return user.isAdmin || user.isSubAdmin ? user : null;
}

export async function GET() {
  await initSchema();
  const admin = await getAdminOrSubAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await sql`
    SELECT
      m.id, m.game_session_id, m.game_type, m.trigger_type, m.action_taken, m.created_at,
      u.username, u.email
    FROM malpractice_logs m
    JOIN users u ON u.id = m.user_id
    ORDER BY m.created_at DESC
    LIMIT 200
  `;

  return NextResponse.json({
    logs: rows.map(r => ({
      id: r.id,
      gameSessionId: r.game_session_id,
      gameType: r.game_type,
      triggerType: r.trigger_type,
      actionTaken: r.action_taken,
      isFlaggedForReview: r.action_taken === 'manual_camera_off',
      createdAt: (r.created_at as Date).toISOString(),
      username: r.username,
      email: r.email,
    })),
  });
}
