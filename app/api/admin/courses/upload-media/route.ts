export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { verifyToken } from '@/lib/auth';
import { getUserById, initSchema } from '@/lib/db';

async function isAdmin(): Promise<boolean> {
  try {
    await initSchema();
    const token = cookies().get('token')?.value;
    if (!token) return false;
    const payload = await verifyToken(token);
    if (!payload) return false;
    const user = await getUserById(payload.userId);
    return user?.isAdmin === true;
  } catch {
    return false;
  }
}

const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/ogg'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch (err) {
    console.error('[upload-media] Failed to parse request body:', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // upload-completed callbacks come from Vercel's servers (no cookie), only gate token requests
  if (body.type === 'blob.generate-client-token') {
    const adminOk = await isAdmin();
    if (!adminOk) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error(
        'BLOB_READ_WRITE_TOKEN is not set. Go to your Vercel project → Settings → Environment Variables and add it.'
      );
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const isVideo = pathname.startsWith('courses/videos/');
        return {
          allowedContentTypes: isVideo ? VIDEO_TYPES : IMAGE_TYPES,
          maximumSizeInBytes: isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024,
          addRandomSuffix: false,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('[upload-media] completed:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error('[upload-media] error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
