import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { getUserById, updateUser } from '@/lib/db';
import { activeMemoryGames, calcMemoryMultiplier } from '@/lib/games';
import type { MemoryGame } from '@/lib/types';

async function getUser() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return getUserById(payload.userId) ?? null;
}

// POST — start memory game
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bet } = await request.json();
  if (!bet || bet <= 0 || bet > user.balance) {
    return NextResponse.json({ error: 'Invalid bet amount' }, { status: 400 });
  }

  updateUser(user.id, { balance: user.balance - bet });

  const game: MemoryGame = {
    id: uuidv4(),
    userId: user.id,
    bet,
    status: 'active',
    wrongGuesses: 0,
    createdAt: new Date().toISOString(),
  };
  activeMemoryGames.set(game.id, game);

  return NextResponse.json({ gameId: game.id, bet, balance: user.balance - bet });
}

// PATCH — complete the game (client sends result)
export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gameId, won, wrongGuesses } = await request.json();

  const game = activeMemoryGames.get(gameId);
  if (!game || game.userId !== user.id) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }
  if (game.status !== 'active') {
    return NextResponse.json({ error: 'Game already ended' }, { status: 400 });
  }

  game.wrongGuesses = wrongGuesses ?? 0;

  let payout = 0;
  if (won) {
    const mult = calcMemoryMultiplier(game.wrongGuesses);
    if (mult > 0) {
      payout = Math.floor(game.bet * mult);
      game.status = 'won';
    } else {
      game.status = 'lost';
    }
  } else {
    game.status = 'lost';
  }

  const freshUser = getUserById(user.id)!;
  const updatedUser = updateUser(user.id, { balance: freshUser.balance + payout });
  const multiplier = won ? calcMemoryMultiplier(game.wrongGuesses) : 0;

  return NextResponse.json({
    payout,
    multiplier,
    balance: updatedUser!.balance,
    won: game.status === 'won',
  });
}
