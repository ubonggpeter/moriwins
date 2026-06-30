import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// Called by the payment processor webhook (or admin) when a deposit is confirmed.
// Adds the amount to the user's balance and pays the referral bonus (50% of deposit)
// to the referrer if this is the referred user's first deposit.
export async function POST(request: Request) {
  await initSchema();

  const token = cookies().get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserById(payload.userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { amount } = await request.json();
  const amt = Math.floor(Number(amount));
  if (!amt || amt <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

  // Credit the deposit
  const [updated] = await sql`
    UPDATE users SET balance = balance + ${amt} WHERE id = ${user.id} RETURNING balance
  `;

  // Pay referral bonus (50%) on the user's first deposit
  const [referral] = await sql`
    SELECT id, referrer_id FROM referrals WHERE referred_id = ${user.id} AND bonus_paid = 0
  `;
  let referralBonus = 0;
  if (referral) {
    referralBonus = Math.floor(amt * 0.5);
    if (referralBonus > 0) {
      await sql`
        UPDATE users SET balance = balance + ${referralBonus}, referral_earnings = referral_earnings + ${referralBonus}
        WHERE id = ${referral.referrer_id as string}
      `;
      await sql`UPDATE referrals SET bonus_paid = ${referralBonus} WHERE id = ${referral.id as string}`;
    }
  }

  // Log the deposit
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${`deposit_log_${uuidv4()}`}, ${JSON.stringify({ userId: user.id, amount: amt, at: new Date().toISOString() })}, NOW())
    ON CONFLICT (key) DO NOTHING
  `;

  return NextResponse.json({
    balance: Number(updated.balance),
    deposited: amt,
    referralBonus,
  });
}
