import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export interface SessionData {
  authenticated: boolean;
}

function getSessionSecret(): string {
  // Try env first, then local .env file
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const envPath = `${homedir()}/.openclaw/workspace/mission-control/.env.local`;
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(/SESSION_SECRET=(.+)/);
    if (match) return match[1].trim();
  }
  return 'fallback-dev-secret-change-in-production-32c';
}

export const sessionOptions = {
  cookieName: 'mc_session',
  password: getSessionSecret(),
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24, // 24 hours
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export function getPasswordHash(): string | null {
  if (process.env.MISSION_CONTROL_PASSWORD_HASH) {
    return process.env.MISSION_CONTROL_PASSWORD_HASH;
  }
  const envPath = `${homedir()}/.openclaw/workspace/mission-control/.env.local`;
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(/MISSION_CONTROL_PASSWORD_HASH=(.+)/);
    if (match) return match[1].trim();
  }
  return null;
}

// Rate limit store (in-memory, per process)
const attempts = new Map<string, { count: number; lockedUntil: number }>();

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = attempts.get(ip);

  if (record) {
    if (record.lockedUntil > now) {
      return { allowed: false, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
    }
    if (now - record.lockedUntil > 60_000) {
      // Reset after lockout period
      attempts.delete(ip);
    }
  }
  return { allowed: true };
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // 15-minute lockout
    record.count = 0;
  }
  attempts.set(ip, record);
}

export function clearAttempts(ip: string): void {
  attempts.delete(ip);
}

export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.authenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  return null;
}
