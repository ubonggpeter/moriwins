export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';

async function getAdmin() {
  await initSchema();
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.userId);
  return user?.isAdmin ? user : null;
}

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await sql`
    SELECT d.id, d.amount, d.note, d.created_at, u.username, u.email
    FROM deposits d
    JOIN users u ON u.id = d.user_id
    ORDER BY d.created_at DESC
  `;

  return NextResponse.json({
    deposits: rows.map(r => ({
      id: r.id,
      username: r.username,
      email: r.email,
      amount: Number(r.amount),
      note: r.note ?? '',
      createdAt: r.created_at,
    })),
  });
}
