import { NextResponse } from 'next/server';
import { sql, initSchema } from '@/lib/db';

export async function GET() {
  try {
    await initSchema();
    // Top Players: ranked by current balance (reflects all game activity)
    const gameEarners = await sql`
      SELECT username, avatar_url, balance AS earnings
      FROM users
      ORDER BY balance DESC
      LIMIT 10
    `;
    // Top Referrers: ranked by total referral earnings
    const referralEarners = await sql`
      SELECT username, avatar_url, referral_earnings AS earnings
      FROM users
      WHERE referral_earnings > 0
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
