import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, getSetting, setSetting, initSchema } from '@/lib/db';

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

  const threshold = await getSetting('withdrawal_threshold', '10000');
  const depositInfo = await getSetting('deposit_info', '[]');

  return NextResponse.json({
    threshold: parseInt(threshold, 10),
    depositInfo: JSON.parse(depositInfo),
  });
}

export async function PATCH(request: Request) {
  await initSchema();
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { threshold, depositInfo } = await request.json();
  if (threshold !== undefined) {
    await setSetting('withdrawal_threshold', String(Math.max(0, Math.floor(threshold))));
  }
  if (depositInfo !== undefined) {
    await setSetting('deposit_info', JSON.stringify(depositInfo));
  }

  return NextResponse.json({ success: true });
}
