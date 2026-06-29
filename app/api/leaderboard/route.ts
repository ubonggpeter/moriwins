import { NextResponse } from 'next/server';
import { sql, initSchema, getSetting } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await initSchema();
    const minRaw = await getSetting('leaderboard_min_earnings', '0');
    const min = parseInt(minRaw, 10) || 0;

    const gameEarners = await sql`
      SELECT username, avatar_url, total_game_winnings AS earnings
      FROM users
      WHERE total_game_winnings > 0 AND total_game_winnings >= ${min}
      ORDER BY total_game_winnings DESC
      LIMIT 10
    `;
    const referralEarners = await sql`
      SELECT username, avatar_url, referral_earnings AS earnings
      FROM users
      WHERE referral_earnings > 0 AND referral_earnings >= ${min}
      ORDER BY referral_earnings DESC
      LIMIT 10
    `;
    return NextResponse.json({
      gameEarners: gameEarners.map(r => ({ username: r.username, avatarUrl: r.avatar_url ?? null, earnings: Number(r.earnings) })),
      referralEarners: referralEarners.map(r => ({ username: r.username, avatarUrl: r.avatar_url ?? null, earnings: Number(r.earnings) })),
    });
  } catch (err) {
    console.error('[leaderboard]', err);
    return NextResponse.json({ gameEarners: [], referralEarners: [] });
  }
}
