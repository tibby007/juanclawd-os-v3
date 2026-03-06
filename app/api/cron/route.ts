import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cronPath = `${homedir()}/.openclaw/cron/jobs.json`;
    if (!existsSync(cronPath)) {
      return NextResponse.json({ jobs: [] });
    }
    const jobs = JSON.parse(readFileSync(cronPath, 'utf-8'));
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Failed to read cron config:', error);
    return NextResponse.json({ error: 'Failed to read cron config' }, { status: 500 });
  }
}
