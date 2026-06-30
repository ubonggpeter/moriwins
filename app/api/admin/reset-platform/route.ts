import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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

  const body = await request.json();
  const resetAdminToo = body.resetAdminToo === true;

  // Reset user financial fields
  let usersReset: number;
  if (resetAdminToo) {
    const result = await sql`
      UPDATE users
      SET balance = 0, total_game_winnings = 0, referral_earnings = 0
    `;
    usersReset = result.count;
  } else {
    const result = await sql`
      UPDATE users
      SET balance = 0, total_game_winnings = 0, referral_earnings = 0
      WHERE id != ${admin.id}
    `;
    usersReset = result.count;
  }

  // Clear game history tables
  await sql`DELETE FROM mines_games`;
  await sql`DELETE FROM memory_games`;
  await sql`DELETE FROM recall_games`;

  // Log reset timestamp
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('last_platform_reset', ${new Date().toISOString()}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${new Date().toISOString()}, updated_at = NOW()
  `;

  console.log(`[admin/reset-platform] Reset by ${admin.email} at ${new Date().toISOString()} — ${usersReset} users reset, resetAdminToo=${resetAdminToo}`);

  return NextResponse.json({ usersReset, resetAdminToo });
}
