import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, getSetting, setSetting, initSchema } from '@/lib/db';

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

  const [threshold, depositInfo, leaderboardMinEarnings, minesStartingLives, memoryStartingLives] = await Promise.all([
    getSetting('withdrawal_threshold', '10000'),
    getSetting('deposit_info', '[]'),
    getSetting('leaderboard_min_earnings', '0'),
    getSetting('mines_starting_lives', '3'),
    getSetting('memory_starting_lives', '3'),
  ]);

  return NextResponse.json({
    threshold: parseInt(threshold, 10),
    depositInfo: JSON.parse(depositInfo),
    leaderboardMinEarnings: parseInt(leaderboardMinEarnings, 10),
    minesStartingLives: parseInt(minesStartingLives, 10) || 3,
    memoryStartingLives: parseInt(memoryStartingLives, 10) || 3,
  });
}

export async function PATCH(request: Request) {
  await initSchema();
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { threshold, depositInfo, leaderboardMinEarnings, minesStartingLives, memoryStartingLives } = await request.json();
  if (threshold !== undefined) {
    await setSetting('withdrawal_threshold', String(Math.max(0, Math.floor(threshold))));
  }
  if (depositInfo !== undefined) {
    await setSetting('deposit_info', JSON.stringify(depositInfo));
  }
  if (leaderboardMinEarnings !== undefined) {
    await setSetting('leaderboard_min_earnings', String(Math.max(0, Math.floor(leaderboardMinEarnings))));
  }
  if (minesStartingLives !== undefined) {
    const v = Math.floor(Number(minesStartingLives));
    if (!v || v < 1) return NextResponse.json({ error: 'Mines starting lives must be at least 1' }, { status: 400 });
    await setSetting('mines_starting_lives', String(v));
  }
  if (memoryStartingLives !== undefined) {
    const v = Math.floor(Number(memoryStartingLives));
    if (!v || v < 1) return NextResponse.json({ error: 'Memory starting lives must be at least 1' }, { status: 400 });
    await setSetting('memory_starting_lives', String(v));
  }

  return NextResponse.json({ success: true });
}
