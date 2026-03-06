import { compare } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import {
  getPasswordHash,
  sessionOptions,
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
  SessionData,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'local';

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rateCheck.retryAfter} seconds.` },
      { status: 429 }
    );
  }

  const { password } = await request.json();
  if (!password) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 });
  }

  const hash = getPasswordHash();
  if (!hash) {
    return NextResponse.json(
      { error: 'No password configured. Add MISSION_CONTROL_PASSWORD_HASH to .env.local' },
      { status: 500 }
    );
  }

  const valid = await compare(password, hash);
  if (!valid) {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  clearAttempts(ip);
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.authenticated = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
