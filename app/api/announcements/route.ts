export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql, initSchema } from '@/lib/db';

export async function GET() {
  await initSchema();
  const rows = await sql`
    SELECT id, title, description, link_url, created_at
    FROM feature_announcements
    WHERE is_active = true
    ORDER BY created_at DESC
  `;
  return NextResponse.json({ announcements: rows });
}
