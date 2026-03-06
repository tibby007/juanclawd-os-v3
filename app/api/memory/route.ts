import { readdirSync, readFileSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const memoryDir = `${homedir()}/.openclaw/workspace/memory`;
    const files = readdirSync(memoryDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const filePath = join(memoryDir, f);
        const stat = statSync(filePath);
        const content = readFileSync(filePath, 'utf-8');
        return {
          name: f,
          path: filePath,
          modified: stat.mtime,
          preview: content.substring(0, 200),
          content,
        };
      })
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Failed to read memory files:', error);
    return NextResponse.json({ error: 'Failed to read memory files' }, { status: 500 });
  }
}
