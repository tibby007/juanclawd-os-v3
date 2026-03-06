import { NextResponse } from 'next/server';
import { getPasswordHash } from '@/lib/auth';
import { compare } from 'bcryptjs';

export async function GET() {
  const hash = getPasswordHash();
  const testPass = 'MC2026Tibbs!';
  const valid = hash ? await compare(testPass, hash) : false;
  return NextResponse.json({ 
    hashPrefix: hash ? hash.substring(0, 20) : null,
    testMatch: valid
  });
}
