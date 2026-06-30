import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { sql, getUserById, initSchema } from '@/lib/db';
import { calcMemoryMultiplier } from '@/lib/games';

async function getAuthedUser() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return getUserById(payload.userId);
}

// POST — start a memory game
export async function POST(request: Request) {
  await initSchema();
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bet } = await request.json();
  if (!bet || bet <= 0 || bet > user.balance) {
    return NextResponse.json({ error: 'Invalid bet amount' }, { status: 400 });
  }

  const gameId = uuidv4();

  const newBalance = await sql.begin(async tx => {
    const [updated] = await tx`
      UPDATE users SET balance = balance - ${bet}
      WHERE id = ${user.id} AND balance >= ${bet}
      RETURNING balance
    `;
    if (!updated) throw new Error('Insufficient balance');

    await tx`
      INSERT INTO memory_games (id, user_id, bet, status, wrong_guesses, extra_lives_bought)
      VALUES (${gameId}, ${user.id}, ${bet}, 'active', 0, 0)
    `;
    return updated.balance as number;
  });

  return NextResponse.json({ gameId, bet, balance: newBalance });
}

// PATCH — complete the game or buy a life
export async function PATCH(request: Request) {
  await initSchema();
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { gameId, action } = body;

  const rows = await sql`SELECT * FROM memory_games WHERE id = ${gameId}`;
  if (!rows.length || rows[0].user_id !== user.id) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }
  if (rows[0].status !== 'active') {
    return NextResponse.json({ error: 'Game already ended' }, { status: 400 });
  }

  // ── Buy extra life ────────────────────────────────────────────────────────
  if (action === 'buy-life') {
    const { wrongGuesses } = body;
    const extraLivesBought = Number(rows[0].extra_lives_bought ?? 0);
    if (extraLivesBought >= 3) {
      return NextResponse.json({ error: 'Maximum extra lives reached' }, { status: 400 });
    }
    const bet: number = Number(rows[0].bet);
    const mult = calcMemoryMultiplier(wrongGuesses ?? 0);
    const cost = mult > 0 ? Math.floor(bet * mult * 0.6) : Math.floor(bet * 0.6);
    if (user.balance < cost) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    const newBalance = await sql.begin(async tx => {
      const [u] = await tx`
        UPDATE users SET balance = balance - ${cost} WHERE id = ${user.id} AND balance >= ${cost} RETURNING balance
      `;
      if (!u) throw new Error('Insufficient balance');
      await tx`UPDATE memory_games SET extra_lives_bought = extra_lives_bought + 1 WHERE id = ${gameId}`;
      return u.balance as number;
    });
    return NextResponse.json({ balance: newBalance, cost, extraLivesBought: extraLivesBought + 1 });
  }

  // ── Complete game ─────────────────────────────────────────────────────────
  const { won, wrongGuesses } = body;

  const bet: number = rows[0].bet;
  const guesses: number = wrongGuesses ?? 0;
  const multiplier = won ? calcMemoryMultiplier(guesses) : 0;
  const payout = won && multiplier > 0 ? Math.floor(bet * multiplier) : 0;
  const finalStatus = won && multiplier > 0 ? 'won' : 'lost';

  const newBalance = await sql.begin(async tx => {
    await tx`
      UPDATE memory_games
      SET status = ${finalStatus}, wrong_guesses = ${guesses}
      WHERE id = ${gameId}
    `;
    const [updated] = await tx`
      UPDATE users SET balance = balance + ${payout}, total_game_winnings = total_game_winnings + ${payout}
      WHERE id = ${user.id}
      RETURNING balance
    `;
    return updated.balance as number;
  });

  // Record result in active tournament entry if present
  if (finalStatus === 'won' && payout > 0) {
    try {
      const [tEntry] = await sql`
        SELECT te.id FROM tournament_entries te
        JOIN tournaments t ON te.tournament_id = t.id
        WHERE te.user_id = ${user.id}
          AND t.game_type = 'memory'
          AND t.status = 'active'
          AND te.result_amount = 0
        LIMIT 1
      `;
      if (tEntry) {
        await sql`UPDATE tournament_entries SET result_amount = ${payout} WHERE id = ${tEntry.id as string}`;
      }
    } catch (err) {
      console.error('[memory/tournament]', err);
    }
  }

  return NextResponse.json({
    payout,
    multiplier,
    balance: newBalance,
    won: finalStatus === 'won',
  });
}
