import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';

async function getAuthedUser() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return getUserById(payload.userId);
}

export async function POST(request: Request) {
  await initSchema();
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { avatarUrl } = await request.json();

  if (!avatarUrl || typeof avatarUrl !== 'string' || !avatarUrl.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
  }
  // Base64 of a 200×200 JPEG at q=0.8 is typically 10–30 KB; reject anything over 200 KB
  if (avatarUrl.length > 200_000) {
    return NextResponse.json({ error: 'Image too large. Please use a smaller photo.' }, { status: 400 });
  }

  await sql`UPDATE users SET avatar_url = ${avatarUrl} WHERE id = ${user.id}`;
  return NextResponse.json({ success: true });
}
