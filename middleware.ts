import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

const PROTECTED = ['/dashboard', '/games', '/deposit', '/withdraw', '/profile'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some(r => pathname.startsWith(r));

  if (isProtected) {
    const token = request.cookies.get('token')?.value;
    if (!token || !(await verifyToken(token))) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/games/:path*', '/deposit/:path*', '/withdraw/:path*', '/profile/:path*'],
};
