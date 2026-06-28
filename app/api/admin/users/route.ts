import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';

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

  const rows = await sql`
    SELECT id, username, email, balance, referral_earnings, total_game_winnings, is_admin, created_at
    FROM users
    ORDER BY created_at DESC
  `;

  return NextResponse.json({
    users: rows.map(r => ({
      id: r.id,
      username: r.username,
      email: r.email,
      balance: Number(r.balance),
      referralEarnings: Number(r.referral_earnings),
      totalGameWinnings: Number(r.total_game_winnings),
      isAdmin: r.is_admin,
      createdAt: r.created_at,
    })),
  });
}
