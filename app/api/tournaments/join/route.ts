import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  await initSchema();

  const token = cookies().get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getUserById(payload.userId);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tournamentId } = await request.json();
  if (!tournamentId) return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });

  const [tournament] = await sql`SELECT * FROM tournaments WHERE id = ${tournamentId}`;
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  if (!['upcoming', 'active'].includes(tournament.status as string)) {
    return NextResponse.json({ error: 'Tournament is not open for entries' }, { status: 400 });
  }

  const [existing] = await sql`
    SELECT id FROM tournament_entries WHERE tournament_id = ${tournamentId} AND user_id = ${user.id}
  `;
  if (existing) return NextResponse.json({ error: 'Already joined this tournament' }, { status: 400 });

  const entryBet = Number(tournament.entry_bet);
  if (user.balance < entryBet) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
  }

  try {
    const newBalance = await sql.begin(async tx => {
      const [updated] = await tx`
        UPDATE users SET balance = balance - ${entryBet}
        WHERE id = ${user.id} AND balance >= ${entryBet}
        RETURNING balance
      `;
      if (!updated) throw new Error('Insufficient balance');
      await tx`
        INSERT INTO tournament_entries (id, tournament_id, user_id, bet_amount)
        VALUES (${uuidv4()}, ${tournamentId}, ${user.id}, ${entryBet})
      `;
      return updated.balance as number;
    });

    return NextResponse.json({ balance: newBalance, entryBet });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to join';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
