import { NextResponse } from 'next/server';
import { sql, initSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await initSchema();

  const standings = await sql`
    SELECT
      u.username,
      te.result_amount,
      te.bet_amount,
      ROW_NUMBER() OVER (ORDER BY te.result_amount DESC, te.joined_at ASC)::int AS rank
    FROM tournament_entries te
    JOIN users u ON u.id = te.user_id
    WHERE te.tournament_id = ${params.id}
    ORDER BY te.result_amount DESC, te.joined_at ASC
  `;

  return NextResponse.json({ standings });
}
