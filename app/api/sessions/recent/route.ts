import { readdirSync, readFileSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const agentsDir = `${homedir()}/.openclaw/agents`;
    const entries: unknown[] = [];

    const agentDirs = readdirSync(agentsDir);
    for (const agentId of agentDirs) {
      const sessionsDir = join(agentsDir, agentId, 'sessions');
      try {
        const files = readdirSync(sessionsDir)
          .filter((f) => f.endsWith('.jsonl'))
          .sort()
          .reverse()
          .slice(0, 5);

        for (const file of files) {
          const filePath = join(sessionsDir, file);
          const stat = statSync(filePath);
          const lines = readFileSync(filePath, 'utf-8')
            .split('\n')
            .filter((l) => l.trim())
            .slice(-20);

          entries.push({
            agentId,
            file,
            lastModified: stat.mtime,
            recentLines: lines
              .map((l) => {
                try { return JSON.parse(l); }
                catch { return null; }
              })
              .filter(Boolean),
          });
        }
      } catch { /* skip agents without sessions */ }
    }

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Failed to read sessions:', error);
    return NextResponse.json({ error: 'Failed to read sessions' }, { status: 500 });
  }
}
