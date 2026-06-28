import { NextResponse } from 'next/server';
import { sql, initSchema } from '@/lib/db';

export async function GET() {
  try {
    await initSchema();
    const gameEarners = await sql`
      SELECT username, total_game_winnings AS earnings
      FROM users
      WHERE total_game_winnings > 0
      ORDER BY total_game_winnings DESC
      LIMIT 10
    `;
    const referralEarners = await sql`
      SELECT username, referral_earnings AS earnings
      FROM users
      WHERE referral_earnings > 0
      ORDER BY referral_earnings DESC
      LIMIT 10
    `;
    return NextResponse.json({
      gameEarners: gameEarners.map(r => ({ username: r.username, earnings: Number(r.earnings) })),
      referralEarners: referralEarners.map(r => ({ username: r.username, earnings: Number(r.earnings) })),
    });
  } catch (err) {
    console.error('[leaderboard]', err);
    return NextResponse.json({ gameEarners: [], referralEarners: [] });
  }
}
