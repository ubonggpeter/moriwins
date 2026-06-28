import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';

async function getAuthedUser() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return getUserById(payload.userId);
}

export async function GET() {
  await initSchema();
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await sql`SELECT COUNT(*) AS count FROM referrals WHERE referrer_id = ${user.id}`;
  const totalReferrals = Number(rows[0]?.count ?? 0);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://moriwins.vercel.app';

  return NextResponse.json({
    referralCode: user.referralCode,
    referralLink: `${baseUrl}/auth/register?ref=${user.referralCode}`,
    totalReferrals,
    referralEarnings: user.referralEarnings,
  });
}
