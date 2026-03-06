import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { NextResponse } from 'next/server';

// Actual JSONL entry shape from ~/.openclaw/agents/*/sessions/*.jsonl
interface RawEntry {
  type?: string;       // always "message" | "summary" | etc.
  timestamp?: string;
  message?: {
    role?: string;     // "user" | "assistant" | "toolResult"
    content?: string | Array<{ type?: string; text?: string }>;
    isError?: boolean; // only on toolResult role
  };
}

interface AgentInfo {
  id: string;
  name: string;
  role: string;
  model: string;
  status: 'active' | 'idle' | 'offline' | 'failed';
  healthScore: number;
  errorCount: number;
  lastAction: string | null;
  sessionCount: number;
}

const DISPLAY_MAP: Record<string, { name: string; role: string; model: string }> = {
  main:   { name: 'Juan',   role: 'COO',      model: 'Claude Sonnet 4.6' },
  emilio: { name: 'Emilio', role: 'Coder',     model: 'Codex 5.3' },
  catina: { name: 'Catina', role: 'PM',        model: 'Qwen 3.5' },
  miguel: { name: 'Miguel', role: 'Marketing', model: 'Qwen 3.5' },
  jules:  { name: 'Jules',  role: 'Content',   model: 'Qwen 3.5' },
};

const AGENT_ORDER = ['main', 'emilio', 'catina', 'miguel', 'jules'];

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

function parseAgent(agentId: string): AgentInfo {
  const display = DISPLAY_MAP[agentId] ?? { name: agentId, role: 'Agent', model: 'unknown' };
  const sessionsDir = join(homedir(), '.openclaw', 'agents', agentId, 'sessions');

  const base: AgentInfo = {
    id: agentId,
    name: display.name,
    role: display.role,
    model: display.model,
    status: 'offline',
    healthScore: 0,
    errorCount: 0,
    lastAction: null,
    sessionCount: 0,
  };

  if (!existsSync(sessionsDir)) return base;

  let sessionFiles: string[];
  try {
    sessionFiles = readdirSync(sessionsDir)
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => join(sessionsDir, f));
  } catch { return base; }

  if (sessionFiles.length === 0) return base;

  base.sessionCount = sessionFiles.length;

  // Latest session = most recently modified .jsonl
  const sorted = sessionFiles
    .map((f) => ({ f, mtime: statSync(f).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  const { f: latestFile, mtime } = sorted[0];

  const now = Date.now();
  if (mtime > now - 30 * 60 * 1000) {
    base.status = 'active';
  } else if (mtime > now - 24 * 60 * 60 * 1000) {
    base.status = 'idle';
  }
  // else stays 'offline'

  let rawLines: string[] = [];
  try {
    rawLines = readFileSync(latestFile, 'utf-8')
      .split('\n')
      .filter((l) => l.trim().length > 0);
  } catch { return base; }

  const last50  = rawLines.slice(-50).flatMap((l) => { const e = parseLine(l); return e ? [e] : []; });
  const last100 = rawLines.slice(-100).flatMap((l) => { const e = parseLine(l); return e ? [e] : []; });

  // Check for failed: assistant messages with "error" in content (last 50 lines)
  const hasFailed = last50.some((e) => {
    const msg = e.message;
    return (
      msg?.role === 'assistant' &&
      getContentText(msg.content).toLowerCase().includes('error')
    );
  });
  if (hasFailed && base.status !== 'offline') base.status = 'failed';

  // healthScore: toolResult success rate from last 100 lines
  const toolResults = last100.filter((e) => e.message?.role === 'toolResult');
  if (toolResults.length > 0) {
    const successes = toolResults.filter((e) => e.message?.isError === false).length;
    base.healthScore = Math.round((successes / toolResults.length) * 100);
  } else {
    base.healthScore = 100;
  }

  // errorCount: errors in last 24h across all session files
  const cutoff24h = now - 24 * 60 * 60 * 1000;
  let errorCount = 0;
  for (const sf of sessionFiles) {
    try {
      const lines = readFileSync(sf, 'utf-8').split('\n').filter((l) => l.trim().length > 0);
      for (const line of lines) {
        const e = parseLine(line);
        if (!e) continue;
        const ts = e.timestamp ? new Date(e.timestamp).getTime() : 0;
        if (ts < cutoff24h) continue;
        const msg = e.message;
        if (!msg) continue;
        const isToolError = msg.role === 'toolResult' && msg.isError === true;
        const isMsgError = msg.role !== undefined && getContentText(msg.content).match(/error/i);
        if (isToolError || isMsgError) errorCount++;
      }
    } catch { /* skip */ }
  }
  base.errorCount = errorCount;

  // lastAction: timestamp of last entry
  for (let i = rawLines.length - 1; i >= 0; i--) {
    const e = parseLine(rawLines[i]);
    if (e?.timestamp) {
      base.lastAction = e.timestamp;
      break;
    }
  }
  if (!base.lastAction && mtime) {
    base.lastAction = new Date(mtime).toISOString();
  }

  return base;
}

export async function GET() {
  try {
    const agents = AGENT_ORDER.map(parseAgent);
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('team/status error:', error);
    return NextResponse.json({ error: 'Failed to read agent status' }, { status: 500 });
  }
}
