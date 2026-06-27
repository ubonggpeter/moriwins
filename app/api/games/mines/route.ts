import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { getUserById, updateUser } from '@/lib/db';
import { activeMinesGames, createMinesGame, revealCell, cashoutMines, calcMinesMultiplier } from '@/lib/games';

async function getUser() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return getUserById(payload.userId) ?? null;
}

// POST /api/games/mines — start a new game
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bet, mineCount } = await request.json();

  if (!bet || bet <= 0 || bet > user.balance) {
    return NextResponse.json({ error: 'Invalid bet amount' }, { status: 400 });
  }
  if (!mineCount || mineCount < 1 || mineCount > 20) {
    return NextResponse.json({ error: 'Mines must be between 1 and 20' }, { status: 400 });
  }

  // Deduct bet immediately
  updateUser(user.id, { balance: user.balance - bet });

  const game = createMinesGame(uuidv4(), user.id, bet, mineCount);

  return NextResponse.json({
    gameId: game.id,
    bet: game.bet,
    mineCount: game.mineCount,
    balance: user.balance - bet,
  });
}

// PATCH /api/games/mines — reveal a cell or cashout
export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gameId, action, cellIndex } = await request.json();

  const game = activeMinesGames.get(gameId);
  if (!game || game.userId !== user.id) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }
  if (game.status !== 'active') {
    return NextResponse.json({ error: 'Game already ended' }, { status: 400 });
  }

  if (action === 'reveal') {
    if (cellIndex === undefined || cellIndex < 0 || cellIndex >= 25) {
      return NextResponse.json({ error: 'Invalid cell' }, { status: 400 });
    }
    if (game.revealed[cellIndex]) {
      return NextResponse.json({ error: 'Cell already revealed' }, { status: 400 });
    }

    const result = revealCell(game, cellIndex);

    if (result.isMine) {
      // Lost — reveal all mines
      return NextResponse.json({
        isMine: true,
        grid: game.grid,
        balance: getUserById(user.id)!.balance,
        payout: 0,
        multiplier: 0,
      });
    }

    return NextResponse.json({
      isMine: false,
      multiplier: result.multiplier,
      payout: result.payout,
      revealedSafe: game.revealedSafe,
    });
  }

  if (action === 'cashout') {
    if (game.revealedSafe === 0) {
      return NextResponse.json({ error: 'Reveal at least one cell first' }, { status: 400 });
    }
    const payout = cashoutMines(game);
    const updatedUser = updateUser(user.id, { balance: getUserById(user.id)!.balance + payout });
    const multiplier = calcMinesMultiplier(25, game.mineCount, game.revealedSafe);

    return NextResponse.json({
      payout,
      multiplier,
      balance: updatedUser!.balance,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
