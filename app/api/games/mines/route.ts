import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { sql, getUserById, initSchema } from '@/lib/db';
import { createMineGrid, calcMinesMultiplier } from '@/lib/games';

async function getAuthedUser() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return getUserById(payload.userId);
}

/** The postgres package in prepare:false mode may return JSONB as a raw string.
 *  Always parse defensively. */
function parseJsonb<T>(value: unknown): T {
  if (typeof value === 'string') return JSON.parse(value) as T;
  return value as T;
}

// POST — start a new mines game
export async function POST(request: Request) {
  await initSchema();
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bet, mineCount } = await request.json();
  if (!bet || bet <= 0 || bet > user.balance) {
    return NextResponse.json({ error: 'Invalid bet amount' }, { status: 400 });
  }
  if (!mineCount || mineCount < 1 || mineCount > 20) {
    return NextResponse.json({ error: 'Mines must be between 1 and 20' }, { status: 400 });
  }

  const grid = createMineGrid(mineCount);
  const revealed = Array(25).fill(false);
  const gameId = uuidv4();

  try {
    const newBalance = await sql.begin(async tx => {
      const [updated] = await tx`
        UPDATE users SET balance = balance - ${bet}
        WHERE id = ${user.id} AND balance >= ${bet}
        RETURNING balance
      `;
      if (!updated) throw new Error('Insufficient balance');

      // Use sql.json() so the postgres driver sends proper JSONB, not TEXT
      await tx`
        INSERT INTO mines_games (id, user_id, grid, revealed, bet, mine_count, status, revealed_safe)
        VALUES (
          ${gameId}, ${user.id},
          ${sql.json(grid)}, ${sql.json(revealed)},
          ${bet}, ${mineCount}, 'active', 0
        )
      `;
      return updated.balance as number;
    });

    return NextResponse.json({ gameId, bet, mineCount, balance: newBalance });
  } catch (err) {
    console.error('[mines/POST]', err);
    const message = err instanceof Error ? err.message : 'Failed to start game';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH — reveal a cell or cash out
export async function PATCH(request: Request) {
  await initSchema();
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gameId, action, cellIndex } = await request.json();

  const rows = await sql`SELECT * FROM mines_games WHERE id = ${gameId}`;
  if (!rows.length || rows[0].user_id !== user.id) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const row = rows[0];
  if (row.status !== 'active') {
    return NextResponse.json({ error: 'Game already ended' }, { status: 400 });
  }

  // Defensively parse JSONB — may arrive as string in prepare:false mode
  const grid     = parseJsonb<boolean[]>(row.grid);
  const revealed = parseJsonb<boolean[]>(row.revealed);
  const revealedSafe: number = Number(row.revealed_safe);
  const mineCount: number    = Number(row.mine_count);
  const bet: number          = Number(row.bet);

  // ── Reveal ────────────────────────────────────────────────────────────────
  if (action === 'reveal') {
    if (cellIndex === undefined || cellIndex < 0 || cellIndex >= 25) {
      return NextResponse.json({ error: 'Invalid cell index' }, { status: 400 });
    }
    if (revealed[cellIndex]) {
      return NextResponse.json({ error: 'Cell already revealed' }, { status: 400 });
    }

    const isMine = grid[cellIndex];
    revealed[cellIndex] = true;

    try {
      if (isMine) {
        await sql`
          UPDATE mines_games
          SET status = 'lost', revealed = ${sql.json(revealed)}
          WHERE id = ${gameId}
        `;
        return NextResponse.json({
          isMine: true,
          grid,           // already a JS array — safe to return directly
          balance: user.balance,
          payout: 0,
          multiplier: 0,
        });
      }

      const newRevealedSafe = revealedSafe + 1;
      await sql`
        UPDATE mines_games
        SET revealed = ${sql.json(revealed)}, revealed_safe = ${newRevealedSafe}
        WHERE id = ${gameId}
      `;
      const multiplier = calcMinesMultiplier(25, mineCount, newRevealedSafe);
      return NextResponse.json({
        isMine: false,
        multiplier,
        payout: Math.floor(bet * multiplier),
        revealedSafe: newRevealedSafe,
      });
    } catch (err) {
      console.error('[mines/PATCH reveal]', err);
      return NextResponse.json({ error: 'Failed to reveal cell' }, { status: 500 });
    }
  }

  // ── Cash out ───────────────────────────────────────────────────────────────
  if (action === 'cashout') {
    if (revealedSafe === 0) {
      return NextResponse.json({ error: 'Reveal at least one cell first' }, { status: 400 });
    }

    const multiplier = calcMinesMultiplier(25, mineCount, revealedSafe);
    const payout = Math.floor(bet * multiplier);

    try {
      const newBalance = await sql.begin(async tx => {
        await tx`UPDATE mines_games SET status = 'won' WHERE id = ${gameId}`;
        const [updated] = await tx`
          UPDATE users SET balance = balance + ${payout}
          WHERE id = ${user.id}
          RETURNING balance
        `;
        return updated.balance as number;
      });

      return NextResponse.json({ payout, multiplier, balance: newBalance });
    } catch (err) {
      console.error('[mines/PATCH cashout]', err);
      return NextResponse.json({ error: 'Failed to cashout' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
