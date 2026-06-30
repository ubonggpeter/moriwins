import { NextResponse } from 'next/server';
import { getSetting, initSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await initSchema();
    const [minesMuted, memoryMuted, recallMuted, minesLives, memoryLives] = await Promise.all([
      getSetting('game_muted_mines', 'false'),
      getSetting('game_muted_memory', 'false'),
      getSetting('game_muted_recall', 'false'),
      getSetting('mines_starting_lives', '3'),
      getSetting('memory_starting_lives', '3'),
    ]);
    return NextResponse.json({
      mines:  { muted: minesMuted === 'true', startingLives: parseInt(minesLives, 10) || 3 },
      memory: { muted: memoryMuted === 'true', startingLives: parseInt(memoryLives, 10) || 3 },
      recall: { muted: recallMuted === 'true' },
    });
  } catch (err) {
    console.error('[games/status]', err);
    return NextResponse.json({ mines: { muted: false, startingLives: 3 }, memory: { muted: false, startingLives: 3 }, recall: { muted: false } });
  }
}
