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
    credited.push({ email: user.email as string, username: user.username as string, amount: amt });
  }

  return NextResponse.json({ credited, notFound });
}
