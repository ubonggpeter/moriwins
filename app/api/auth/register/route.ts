import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getUserByEmail, getUserByUsername, getUserByReferralCode, createUser, sql } from '@/lib/db';
import { signToken } from '@/lib/auth';

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function POST(request: Request) {
  try {
    const { username, email, password, ref: incomingRef } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    if (await getUserByEmail(email)) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }
    if (await getUserByUsername(username)) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }

    const referralCode = generateReferralCode();
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await createUser({
      id: userId,
      username,
      email,
      passwordHash,
      balance: 1000,
      createdAt: new Date().toISOString(),
      isAdmin: false,
      referralCode,
      referredBy: null,
      referralEarnings: 0,
      totalGameWinnings: 0,
      avatarUrl: null,
    });

    // Handle referral bonus — ref param is the referrer's username
    if (incomingRef) {
      const referrer = await getUserByUsername(String(incomingRef)) ?? await getUserByReferralCode(String(incomingRef));
      if (referrer && referrer.id !== userId) {
        await sql`UPDATE users SET balance = balance + 50, referral_earnings = referral_earnings + 50 WHERE id = ${referrer.id}`;
        await sql`INSERT INTO referrals (id, referrer_id, referred_id, bonus_paid) VALUES (${uuidv4()}, ${referrer.id}, ${userId}, 50)`;
      }
    }

    const token = await signToken({ userId: user.id, username: user.username });
    const res = NextResponse.json({
      user: { id: user.id, username: user.username, email: user.email, balance: user.balance },
    });
    res.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[register] Unhandled error:', message, err);
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' ? message : 'Internal server error' },
      { status: 500 }
    );
  }
}
