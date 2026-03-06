import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { NextResponse } from 'next/server';

interface DocFile {
  name: string;
  path: string;
  modified: string;
  size: number;
  preview: string;
}

function scanDir(dir: string, recursive = false): DocFile[] {
  if (!existsSync(dir)) return [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    const results: DocFile[] = [];
    for (const entry of entries) {
      if (recursive && entry.isDirectory()) continue; // top-level only unless noted
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith('.md')) continue;
      const filePath = join(dir, entry.name);
      try {
        const stat = statSync(filePath);
        const content = readFileSync(filePath, 'utf-8');
        results.push({
          name: entry.name,
          path: filePath,
          modified: stat.mtime.toISOString(),
          size: stat.size,
          preview: content.slice(0, 150),
        });
      } catch {
        // skip unreadable files
      }
    }
    return results;
  } catch {
    return [];
  }
}

function scanMemoryDir(dir: string): DocFile[] {
  // top-level .md files only, no subdirs
  return scanDir(dir, false);
}

export async function GET() {
  try {
    const base = join(homedir(), '.openclaw', 'workspace');
    const docsDir = join(base, 'docs');
    const memoryDir = join(base, 'memory');
    const cccDir = join(memoryDir, 'ccc');

    const all: DocFile[] = [
      ...scanDir(base, false),
      ...scanDir(docsDir, false),
      ...scanMemoryDir(memoryDir),
      ...scanDir(cccDir, false),
    ];

    // Deduplicate by path
    const seen = new Set<string>();
    const unique = all.filter((f) => {
      if (seen.has(f.path)) return false;
      seen.add(f.path);
      return true;
    });

    unique.sort(
      (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()
    );

    return NextResponse.json({ documents: unique });
  } catch (error) {
    console.error('documents error:', error);
    return NextResponse.json({ error: 'Failed to read documents' }, { status: 500 });
  }
}
