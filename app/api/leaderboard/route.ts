import { NextResponse } from 'next/server';
import { sql, initSchema, getSetting } from '@/lib/db';

export async function GET() {
  try {
    await initSchema();
    const minRaw = await getSetting('leaderboard_min_earnings', '0');
    const min = parseInt(minRaw, 10) || 0;

    const gameEarners = await sql`
      SELECT username, avatar_url, balance AS earnings
      FROM users
      WHERE balance >= ${min}
      ORDER BY balance DESC
      LIMIT 10
    `;
    const referralEarners = await sql`
      SELECT username, avatar_url, referral_earnings AS earnings
      FROM users
      WHERE referral_earnings >= ${min} AND referral_earnings > 0
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
