import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';
import { completeTournament } from '@/lib/tournaments';

export const dynamic = 'force-dynamic';

async function getAdmin() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.userId);
  return user?.isAdmin ? user : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  await initSchema();
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { action } = await request.json();
  const tournamentId = params.id;

  const [tournament] = await sql`SELECT * FROM tournaments WHERE id = ${tournamentId}`;
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });

  if (action === 'activate') {
    await sql`UPDATE tournaments SET status = 'active' WHERE id = ${tournamentId}`;
    return NextResponse.json({ status: 'active' });
  }

  if (action === 'end') {
    if (tournament.status === 'completed') {
      return NextResponse.json({ error: 'Tournament already completed' }, { status: 400 });
    }
    const result = await completeTournament(tournamentId);
    return NextResponse.json({ status: 'completed', ...result });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
