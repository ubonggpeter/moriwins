import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export async function GET() {
  const token = cookies().get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const user = await getUserById(payload.userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    username: user.username,
    email: user.email,
    balance: user.balance,
    referralCode: user.referralCode,
    referralEarnings: user.referralEarnings,
    totalGameWinnings: user.totalGameWinnings,
    isAdmin: user.isAdmin === true,
    avatarUrl: user.avatarUrl ?? null,
  });
}
