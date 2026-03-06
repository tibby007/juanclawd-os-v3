// GET /api/config/raw - Get raw openclaw.json content
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const OPENCLAW_CONFIG = path.join(process.env.HOME || '/Users/juanclawdbot', '.openclaw/openclaw.json');

export async function GET() {
  try {
    const configContent = await fs.readFile(OPENCLAW_CONFIG, 'utf-8');
    return NextResponse.json({ content: configContent, path: OPENCLAW_CONFIG });
  } catch (error: any) {
    console.error('Failed to read openclaw.json:', error);
    return NextResponse.json({ error: error.message || 'Failed to read configuration' }, { status: 500 });
  }
}
