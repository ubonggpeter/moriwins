import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { getUserById, getSetting, sql, initSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

  const rows = await sql`
    SELECT w.*, b.bank_name, b.account_number, b.account_name
    FROM withdrawals w
    JOIN bank_accounts b ON b.id = w.bank_account_id
    WHERE w.user_id = ${user.id}
    ORDER BY w.created_at DESC
  `;

  return NextResponse.json({
    withdrawals: rows.map(r => ({
      id: r.id,
      amount: Number(r.amount),
      status: r.status,
      type: (r.type as string) ?? 'balance',
      adminNote: r.admin_note,
      bankName: r.bank_name,
      accountNumber: r.account_number,
      accountName: r.account_name,
      createdAt: r.created_at,
    })),
  });
}

export async function POST(request: Request) {
  await initSchema();
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { amount, type = 'balance' } = await request.json();

  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  if (!['balance', 'referral'].includes(type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  const bankRows = await sql`SELECT * FROM bank_accounts WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 1`;
  if (!bankRows.length) return NextResponse.json({ error: 'Please add a bank account first' }, { status: 400 });

  // Prevent duplicate pending withdrawal of same type
  const pending = await sql`SELECT id FROM withdrawals WHERE user_id = ${user.id} AND status = 'pending' AND type = ${type}`;
  if (pending.length) {
    return NextResponse.json(
      { error: `You already have a pending ${type === 'referral' ? 'referral' : 'balance'} withdrawal` },
      { status: 400 }
    );
  }

  if (type === 'referral') {
    if (amount > user.referralAvailable) {
      return NextResponse.json({ error: `Insufficient referral earnings (available: $${user.referralAvailable})` }, { status: 400 });
    }
    if (amount > user.balance) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const withdrawalId = uuidv4();
    await sql.begin(async tx => {
      const [updated] = await tx`
        UPDATE users
        SET balance = balance - ${amount}, referral_available = referral_available - ${amount}
        WHERE id = ${user.id} AND balance >= ${amount} AND referral_available >= ${amount}
        RETURNING balance
      `;
      if (!updated) throw new Error('Insufficient balance or referral earnings');
      await tx`
        INSERT INTO withdrawals (id, user_id, amount, bank_account_id, status, type)
        VALUES (${withdrawalId}, ${user.id}, ${amount}, ${bankRows[0].id}, 'pending', 'referral')
      `;
    });

    return NextResponse.json({ success: true, withdrawalId });
  }

  // type === 'balance'
  const thresholdStr = await getSetting('withdrawal_threshold', '10000');
  const threshold = parseInt(thresholdStr, 10);

  if (user.balance < threshold) {
    return NextResponse.json(
      { error: `Minimum balance to withdraw is $${threshold.toLocaleString()}` },
      { status: 400 }
    );
  }
  if (amount > user.balance) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
  }

  const withdrawalId = uuidv4();
  await sql.begin(async tx => {
    const [updated] = await tx`
      UPDATE users SET balance = balance - ${amount}
      WHERE id = ${user.id} AND balance >= ${amount}
      RETURNING balance
    `;
    if (!updated) throw new Error('Insufficient balance');
    await tx`
      INSERT INTO withdrawals (id, user_id, amount, bank_account_id, status, type)
      VALUES (${withdrawalId}, ${user.id}, ${amount}, ${bankRows[0].id}, 'pending', 'balance')
    `;
  });

  return NextResponse.json({ success: true, withdrawalId });
}
