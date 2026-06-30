export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { sql, initSchema } from '@/lib/db';

export async function GET() {
  await initSchema();

  const rows = await sql`
    SELECT c.id, c.title, c.description, c.price, c.thumbnail_url, c.video_url,
      COUNT(cp2.id)::int AS purchase_count
    FROM courses c
    LEFT JOIN course_purchases cp2 ON cp2.course_id = c.id
    WHERE c.is_active = true
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;

  const userPurchases: Record<string, boolean> = {};

  const token = cookies().get('token')?.value;
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      const purchases = await sql`
        SELECT course_id FROM course_purchases WHERE user_id = ${payload.userId}
      `;
      for (const p of purchases) {
        userPurchases[p.course_id as string] = true;
      }
    }
  }

  return NextResponse.json({ courses: rows, userPurchases });
}
