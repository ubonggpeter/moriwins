import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
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

  const rows = await sql`SELECT * FROM bank_accounts WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 1`;
  if (!rows.length) return NextResponse.json({ account: null });

  const r = rows[0];
  return NextResponse.json({
    account: {
      id: r.id,
      bankName: r.bank_name,
      accountNumber: r.account_number,
      accountName: r.account_name,
      createdAt: r.created_at,
    },
  });
}

export async function POST(request: Request) {
  await initSchema();
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bankName, accountNumber, accountName } = await request.json();
  if (!bankName || !accountNumber || !accountName) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 });
  }

  await sql`DELETE FROM bank_accounts WHERE user_id = ${user.id}`;
  const id = uuidv4();
  await sql`
    INSERT INTO bank_accounts (id, user_id, bank_name, account_number, account_name)
    VALUES (${id}, ${user.id}, ${bankName}, ${accountNumber}, ${accountName})
  `;

  return NextResponse.json({ success: true, id });
}
