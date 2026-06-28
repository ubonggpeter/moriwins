import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { getUserById, getSetting, sql, initSchema } from '@/lib/db';

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

  const { amount } = await request.json();

  const thresholdStr = await getSetting('withdrawal_threshold', '10000');
  const threshold = parseInt(thresholdStr, 10);

  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  if (user.balance < threshold) {
    return NextResponse.json(
      { error: `Minimum balance to withdraw is $${threshold.toLocaleString()}` },
      { status: 400 }
    );
  }
  if (amount > user.balance) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
  }

  const bankRows = await sql`SELECT * FROM bank_accounts WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 1`;
  if (!bankRows.length) return NextResponse.json({ error: 'Please add a bank account first' }, { status: 400 });

  const pending = await sql`SELECT id FROM withdrawals WHERE user_id = ${user.id} AND status = 'pending'`;
  if (pending.length) {
    return NextResponse.json({ error: 'You already have a pending withdrawal request' }, { status: 400 });
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
      INSERT INTO withdrawals (id, user_id, amount, bank_account_id, status)
      VALUES (${withdrawalId}, ${user.id}, ${amount}, ${bankRows[0].id}, 'pending')
    `;
  });

  return NextResponse.json({ success: true, withdrawalId });
}
