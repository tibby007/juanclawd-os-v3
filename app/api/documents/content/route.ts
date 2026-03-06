import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { resolve, join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get('path');

    if (!rawPath) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    const allowedBase = resolve(join(homedir(), '.openclaw', 'workspace'));
    const resolvedPath = resolve(rawPath.replace(/^~/, homedir()));

    if (!resolvedPath.startsWith(allowedBase)) {
      return NextResponse.json({ error: 'Path outside allowed directory' }, { status: 403 });
    }

    if (!existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const content = readFileSync(resolvedPath, 'utf-8');
    return NextResponse.json({ content });
  } catch (error) {
    console.error('documents/content error:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
