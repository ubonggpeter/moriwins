import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';
import { completeTournament } from '@/lib/tournaments';

export const dynamic = 'force-dynamic';

export async function GET() {
  await initSchema();

  await sql`UPDATE tournaments SET status = 'active' WHERE status = 'upcoming' AND start_time <= NOW()`;

  // Auto-complete active tournaments whose end_time has passed
  const expired = await sql`
    SELECT id FROM tournaments
    WHERE status = 'active' AND end_time IS NOT NULL AND end_time <= NOW()
  `;
  for (const t of expired) {
    try { await completeTournament(t.id as string); } catch (err) { console.error('[tournaments/auto-complete]', err); }
  }

  let userId: string | null = null;
  try {
    const token = cookies().get('token')?.value;
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        const u = await getUserById(payload.userId);
        if (u) userId = u.id;
      }
    }
  } catch { /* unauthenticated browse is fine */ }

  const tournaments = await sql`
    SELECT
      t.id, t.game_type, t.entry_bet, t.start_time, t.end_time, t.status, t.created_at,
      COUNT(te.id)::int                         AS entry_count,
      COALESCE(SUM(te.bet_amount), 0)::int      AS total_pool
    FROM tournaments t
    LEFT JOIN tournament_entries te ON te.tournament_id = t.id
    WHERE t.status IN ('upcoming', 'active')
    GROUP BY t.id
    ORDER BY t.start_time ASC
  `;

  // Today's winners from completed tournaments
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayWinners = await sql`
    SELECT
      t.id AS tournament_id, t.game_type,
      u.username, te.result_amount, te.bet_amount
    FROM tournaments t
    JOIN tournament_entries te ON te.tournament_id = t.id
    JOIN users u ON u.id = te.user_id
    WHERE t.status = 'completed'
      AND t.created_at >= ${todayStart.toISOString()}
      AND te.result_amount > 0
    ORDER BY te.result_amount DESC
    LIMIT 20
  `;

  // Which tournaments has the current user already joined?
  const userEntries: Record<string, boolean> = {};
  if (userId) {
    const rows = await sql`
      SELECT tournament_id FROM tournament_entries WHERE user_id = ${userId}
    `;
    for (const r of rows) userEntries[r.tournament_id as string] = true;
  }

  return NextResponse.json({ tournaments, todayWinners, userEntries });
}
