import { readdirSync, readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

interface RawEntry {
  type?: string;
  timestamp?: string;
  message?: {
    role?: string;
    content?: string | Array<{ type?: string; text?: string }>;
    isError?: boolean;
  };
}

interface ErrorExample {
  message: string;
  timestamp: string;
}

interface ErrorPattern {
  keyword: string;
  count: number;
  examples: ErrorExample[];
}

const PATTERN_KEYWORDS = [
  'API', 'timeout', 'permission', 'auth', 'rate limit',
  'not found', 'failed', 'undefined',
];

function getContentText(
  content: string | Array<{ type?: string; text?: string }> | undefined
): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return content.map((c) => (c.type === 'text' ? (c.text ?? '') : '')).join(' ');
}

function parseLine(line: string): RawEntry | null {
  try { return JSON.parse(line) as RawEntry; } catch { return null; }
}

function getRangeCutoff(range: string): number {
  if (range === '7d') return Date.now() - 7 * 24 * 60 * 60 * 1000;
  return Date.now() - 24 * 60 * 60 * 1000;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') ?? '24h';
    const cutoff = getRangeCutoff(range);

    const sessionsDir = join(homedir(), '.openclaw', 'agents', 'main', 'sessions');

    if (!existsSync(sessionsDir)) {
      return NextResponse.json({
        summary: { total: 0, trend: 'stable', period: range },
        byAgent: {},
        patterns: PATTERN_KEYWORDS.map((k) => ({ keyword: k, count: 0, examples: [] })),
      });
    }

    const sessionFiles = readdirSync(sessionsDir)
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => join(sessionsDir, f));

    const errors: Array<{ message: string; timestamp: string }> = [];

    for (const sf of sessionFiles) {
      try {
        const lines = readFileSync(sf, 'utf-8')
          .split('\n')
          .filter((l) => l.trim().length > 0);

        for (const line of lines) {
          const e = parseLine(line);
          if (!e) continue;
          const ts = e.timestamp ? new Date(e.timestamp).getTime() : 0;
          if (ts < cutoff) continue;

          const msg = e.message;
          if (!msg) continue;

          const text = getContentText(msg.content);
          const isToolError = msg.role === 'toolResult' && msg.isError === true;
          const isMsgError =
            msg.role !== undefined &&
            (text.includes('error') || text.includes('Error') || text.includes('ERROR'));

          if (isToolError || isMsgError) {
            errors.push({
              message: text.slice(0, 200) || (isToolError ? '[tool error]' : '[error]'),
              timestamp: e.timestamp ?? new Date(ts).toISOString(),
            });
          }
        }
      } catch { /* skip */ }
    }

    const patterns: ErrorPattern[] = PATTERN_KEYWORDS.map((keyword) => {
      const matches = errors.filter((e) =>
        e.message.toLowerCase().includes(keyword.toLowerCase())
      );
      return {
        keyword,
        count: matches.length,
        examples: matches.slice(0, 3),
      };
    });

    const midpoint = cutoff + (Date.now() - cutoff) / 2;
    const firstHalf = errors.filter((e) => new Date(e.timestamp).getTime() < midpoint).length;
    const secondHalf = errors.filter((e) => new Date(e.timestamp).getTime() >= midpoint).length;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (secondHalf > firstHalf + 2) trend = 'up';
    else if (firstHalf > secondHalf + 2) trend = 'down';

    return NextResponse.json({
      summary: { total: errors.length, trend, period: range },
      byAgent: { main: errors.length },
      patterns,
    });
  } catch (error) {
    console.error('team/errors error:', error);
    return NextResponse.json({ error: 'Failed to read error data' }, { status: 500 });
  }
}
