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
    SELECT w.*, u.username, u.email, b.bank_name, b.account_number, b.account_name
    FROM withdrawals w
    JOIN users u ON u.id = w.user_id
    JOIN bank_accounts b ON b.id = w.bank_account_id
    ORDER BY w.created_at DESC
  `;

  return NextResponse.json({
    withdrawals: rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      username: r.username,
      email: r.email,
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
