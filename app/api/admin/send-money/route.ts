import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getAdmin() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.userId);
  return user?.isAdmin ? user : null;
}

export async function POST(request: Request) {
  await initSchema();
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { emails, amount } = await request.json();

  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: 'No emails provided' }, { status: 400 });
  }
  const amt = Number(amount);
  if (!amt || amt <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const credited: { email: string; username: string; amount: number }[] = [];
  const notFound: string[] = [];

  for (const rawEmail of emails) {
    const email = String(rawEmail).trim().toLowerCase();
    if (!email) continue;

    const [user] = await sql`SELECT id, username, email FROM users WHERE LOWER(email) = ${email}`;
    if (!user) {
      notFound.push(email);
      continue;
    }

    await sql`UPDATE users SET balance = balance + ${amt} WHERE id = ${user.id as string}`;
    await sql`INSERT INTO deposits (id, user_id, amount, note) VALUES (${uuidv4()}, ${user.id as string}, ${amt}, ${'Admin credit'})`;
    credited.push({ email: user.email as string, username: user.username as string, amount: amt });

    // Pay referral bonus (50% of credited amount) on the referred user's first credit
    const [referral] = await sql`
      SELECT id, referrer_id FROM referrals WHERE referred_id = ${user.id as string} AND bonus_paid = 0
    `;
    if (referral) {
      const bonus = Math.floor(amt * 0.5);
      if (bonus > 0) {
        await sql`UPDATE users SET balance = balance + ${bonus}, referral_earnings = referral_earnings + ${bonus}, referral_available = referral_available + ${bonus} WHERE id = ${referral.referrer_id as string}`;
        await sql`UPDATE referrals SET bonus_paid = ${bonus} WHERE id = ${referral.id as string}`;
      }
    }
  }

  return NextResponse.json({ credited, notFound });
}
