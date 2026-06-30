export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getUserById, initSchema } from '@/lib/db';
import { put } from '@vercel/blob';

async function getAdmin() {
  await initSchema();
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.userId);
  if (!user?.isAdmin) return null;
  return user;
}

const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/ogg'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;  // 10 MB

export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const mediaType = formData.get('type') as string | null; // 'video' | 'thumbnail'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (!mediaType || !['video', 'thumbnail'].includes(mediaType)) {
    return NextResponse.json({ error: 'type must be "video" or "thumbnail"' }, { status: 400 });
  }

  const allowed = mediaType === 'video' ? VIDEO_TYPES : IMAGE_TYPES;
  const maxBytes = mediaType === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

  if (!allowed.includes(file.type)) {
    return NextResponse.json({
      error: `Invalid file type: ${file.type}. Allowed: ${allowed.join(', ')}`,
    }, { status: 400 });
  }
  if (file.size > maxBytes) {
    return NextResponse.json({
      error: `File too large. Max size: ${Math.round(maxBytes / 1024 / 1024)} MB`,
    }, { status: 400 });
  }

  const ext = file.name.split('.').pop() ?? (mediaType === 'video' ? 'mp4' : 'jpg');
  const prefix = mediaType === 'video' ? 'courses/videos' : 'courses/thumbnails';
  const pathname = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const blob = await put(pathname, file, {
    access: 'public',
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}
