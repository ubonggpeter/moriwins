import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  await initSchema();
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { action } = await request.json();
  const tournamentId = params.id;

  const [tournament] = await sql`SELECT * FROM tournaments WHERE id = ${tournamentId}`;
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });

  if (action === 'activate') {
    await sql`UPDATE tournaments SET status = 'active' WHERE id = ${tournamentId}`;
    return NextResponse.json({ status: 'active' });
  }

  if (action === 'end') {
    if (tournament.status === 'completed') {
      return NextResponse.json({ error: 'Tournament already completed' }, { status: 400 });
    }

    const entries = await sql`SELECT * FROM tournament_entries WHERE tournament_id = ${tournamentId}`;

    type Entry = { id: string; user_id: string; bet_amount: number; result_amount: number };
    const all = entries as unknown as Entry[];
    const winners = all.filter(e => Number(e.result_amount) > 0);
    const losers  = all.filter(e => Number(e.result_amount) === 0);

    const totalLosses = losers.reduce((s, e) => s + Number(e.bet_amount), 0);
    const prizePool   = Math.floor(totalLosses * 0.5);

    let distributed = 0;
    if (winners.length > 0 && prizePool > 0) {
      const sumResults = winners.reduce((s, e) => s + Number(e.result_amount), 0);
      for (const w of winners) {
        const share = Math.floor(prizePool * Number(w.result_amount) / sumResults);
        if (share > 0) {
          await sql`
            UPDATE users
            SET balance = balance + ${share},
                total_game_winnings = total_game_winnings + ${share}
            WHERE id = ${w.user_id}
          `;
          distributed += share;
        }
      }
    }

    await sql`UPDATE tournaments SET status = 'completed' WHERE id = ${tournamentId}`;

    console.log(`[admin/tournaments] Ended ${tournamentId}: ${all.length} entries, pool $${prizePool}, distributed $${distributed}`);

    return NextResponse.json({
      status: 'completed',
      totalEntries: all.length,
      winnersCount: winners.length,
      losersCount: losers.length,
      totalLosses,
      prizePool,
      distributed,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
