import { readFileSync } from 'fs';
import { homedir } from 'os';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const configPath = `${homedir()}/.openclaw/openclaw.json`;
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const agents = config.agents?.list || [];
    const defaults = config.agents?.defaults || {};
    return NextResponse.json({ agents, defaults });
  } catch (error) {
    console.error('Failed to read agent config:', error);
    return NextResponse.json({ error: 'Failed to read agent config' }, { status: 500 });
  }
}
