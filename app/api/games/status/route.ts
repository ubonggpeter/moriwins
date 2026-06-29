import { NextResponse } from 'next/server';
import { getSetting, initSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await initSchema();
    const [minesMuted, memoryMuted] = await Promise.all([
      getSetting('game_muted_mines', 'false'),
      getSetting('game_muted_memory', 'false'),
    ]);
    return NextResponse.json({
      mines: { muted: minesMuted === 'true' },
      memory: { muted: memoryMuted === 'true' },
    });
  } catch (err) {
    console.error('[games/status]', err);
    return NextResponse.json({ mines: { muted: false }, memory: { muted: false } });
  }
}
