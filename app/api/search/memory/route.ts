import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

interface MatchLine {
  line: number;
  text: string;
}

interface SearchResult {
  file: string;
  path: string;
  matches: MatchLine[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const memoryDir = join(homedir(), '.openclaw', 'workspace', 'memory');

    let matchedPaths: string[] = [];
    try {
      const output = execSync(
        `grep -ril ${JSON.stringify(q)} ${JSON.stringify(memoryDir)} 2>/dev/null`,
        { encoding: 'utf-8', timeout: 10000 }
      );
      matchedPaths = output.trim().split('\n').filter(Boolean).slice(0, 20);
    } catch {
      // grep exits with code 1 when no matches
      matchedPaths = [];
    }

    const results: SearchResult[] = matchedPaths.map((filePath) => {
      const fileName = filePath.split('/').at(-1) ?? filePath;
      let matches: MatchLine[] = [];

      if (existsSync(filePath)) {
        try {
          const lines = readFileSync(filePath, 'utf-8').split('\n');
          matches = lines
            .flatMap((text, idx) =>
              text.toLowerCase().includes(q.toLowerCase())
                ? [{ line: idx + 1, text: text.trim() }]
                : []
            )
            .slice(0, 5);
        } catch { /* skip */ }
      }

      return { file: fileName, path: filePath, matches };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('search/memory error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
