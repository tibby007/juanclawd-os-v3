import { existsSync, copyFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { resolve, join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { path?: string; content?: string };
    const { path: rawPath, content } = body;

    if (!rawPath || content === undefined) {
      return NextResponse.json({ error: 'Missing path or content' }, { status: 400 });
    }

    const allowedBase = resolve(join(homedir(), '.openclaw', 'workspace'));
    const resolvedPath = resolve(rawPath.replace(/^~/, homedir()));

    if (!resolvedPath.startsWith(allowedBase)) {
      return NextResponse.json({ error: 'Path outside allowed directory' }, { status: 403 });
    }

    // Create backup
    if (existsSync(resolvedPath)) {
      copyFileSync(resolvedPath, resolvedPath + '.bak');
    }

    writeFileSync(resolvedPath, content, 'utf-8');

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('documents/save error:', error);
    return NextResponse.json({ error: 'Failed to save document' }, { status: 500 });
  }
}
