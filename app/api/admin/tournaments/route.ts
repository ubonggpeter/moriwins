import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

  await sql`UPDATE tournaments SET status = 'active' WHERE status = 'upcoming' AND start_time <= NOW()`;

  const tournaments = await sql`
    SELECT t.*,
      COUNT(te.id)::int         AS entry_count,
      COALESCE(SUM(te.bet_amount), 0)::int  AS total_pool,
      COUNT(CASE WHEN te.result_amount > 0 THEN 1 END)::int AS winner_count
    FROM tournaments t
    LEFT JOIN tournament_entries te ON te.tournament_id = t.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
    LIMIT 50
  `;

  return NextResponse.json({ tournaments });
}

export async function POST(request: Request) {
  await initSchema();
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { gameType, entryBet, startTime, durationMinutes } = await request.json();

  if (!['mines', 'memory', 'recall'].includes(gameType)) {
    return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
  }
  const bet = Number(entryBet);
  if (!bet || bet <= 0) {
    return NextResponse.json({ error: 'Entry bet must be positive' }, { status: 400 });
  }
  const dur = Number(durationMinutes);
  if (!dur || dur <= 0) {
    return NextResponse.json({ error: 'Duration must be positive' }, { status: 400 });
  }

  const start = startTime ? new Date(startTime) : new Date();
  const end   = new Date(start.getTime() + dur * 60 * 1000);
  const status = start <= new Date() ? 'active' : 'upcoming';
  const id = uuidv4();

  await sql`
    INSERT INTO tournaments (id, game_type, entry_bet, start_time, end_time, status, created_by)
    VALUES (${id}, ${gameType}, ${bet}, ${start.toISOString()}, ${end.toISOString()}, ${status}, ${admin.id})
  `;

  const [t] = await sql`SELECT * FROM tournaments WHERE id = ${id}`;
  return NextResponse.json({ tournament: t });
}
