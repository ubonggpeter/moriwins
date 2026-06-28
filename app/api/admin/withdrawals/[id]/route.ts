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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  await initSchema();
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { action, adminNote } = await request.json();
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const rows = await sql`SELECT * FROM withdrawals WHERE id = ${params.id}`;
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const withdrawal = rows[0];
  if (withdrawal.status !== 'pending') {
    return NextResponse.json({ error: 'Withdrawal already processed' }, { status: 400 });
  }

  if (action === 'reject') {
    await sql.begin(async tx => {
      await tx`UPDATE withdrawals SET status = 'rejected', admin_note = ${adminNote ?? null}, updated_at = NOW() WHERE id = ${params.id}`;
      await tx`UPDATE users SET balance = balance + ${Number(withdrawal.amount)} WHERE id = ${withdrawal.user_id}`;
    });
  } else {
    await sql`UPDATE withdrawals SET status = 'approved', admin_note = ${adminNote ?? null}, updated_at = NOW() WHERE id = ${params.id}`;
  }

  return NextResponse.json({ success: true });
}
