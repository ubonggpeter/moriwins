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
    SELECT id, username, email, is_sub_admin, permissions, created_at
    FROM users
    WHERE is_sub_admin = true
    ORDER BY username
  `;

  return NextResponse.json({
    subAdmins: rows.map(r => ({
      id: r.id,
      username: r.username,
      email: r.email,
      permissions: r.permissions ?? {},
      createdAt: r.created_at,
    })),
  });
}

// POST: grant or revoke sub-admin, set permissions
// body: { email, isSubAdmin, permissions }
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email, isSubAdmin, permissions } = await request.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const rows = await sql`SELECT id, username FROM users WHERE LOWER(email) = LOWER(${email})`;
  if (!rows.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const targetUser = rows[0];
  const perms = permissions ?? {};

  await sql`
    UPDATE users
    SET is_sub_admin = ${!!isSubAdmin}, permissions = ${JSON.stringify(perms)}
    WHERE id = ${targetUser.id}
  `;

  return NextResponse.json({ id: targetUser.id, username: targetUser.username, isSubAdmin: !!isSubAdmin, permissions: perms });
}
