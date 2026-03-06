import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { NextResponse } from 'next/server';

const HOME = homedir();

// --- Agent productivity + cost: parse session JSONL files ---
function parseSessionStats() {
  const sessionsDir = join(HOME, '.openclaw/agents/main/sessions');
  let totalMessages = 0;
  let totalToolCalls = 0;
  let totalTokens = 0;
  let totalCost = 0;
  const sessionSummaries: Array<{ id: string; messages: number; tools: number; tokens: number; cost: number }> = [];

  let files: string[] = [];
  try {
    files = readdirSync(sessionsDir)
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => join(sessionsDir, f));
  } catch {
    return { totalMessages, totalToolCalls, totalTokens, totalCost, sessionSummaries };
  }

  for (const file of files) {
    let msgs = 0;
    let tools = 0;
    let tokens = 0;
    let cost = 0;
    try {
      const lines = readFileSync(file, 'utf-8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const d = JSON.parse(line);
          if (d.type === 'message') {
            const role = d.message?.role;
            if (role === 'assistant') msgs++;
            const usage = d.message?.usage ?? {};
            cost += usage.cost?.total ?? 0;
            tokens += usage.totalTokens ?? 0;
          }
          if (d.type === 'toolResult') tools++;
        } catch {
          // skip malformed line
        }
      }
    } catch {
      // skip unreadable file
    }
    const id = file.split('/').pop()?.replace('.jsonl', '') ?? file;
    sessionSummaries.push({ id, messages: msgs, tools, tokens, cost });
    totalMessages += msgs;
    totalToolCalls += tools;
    totalTokens += tokens;
    totalCost += cost;
  }

  return { totalMessages, totalToolCalls, totalTokens, totalCost, sessionCount: files.length, sessionSummaries };
}

// --- Revenue: local JSON file ---
function readRevenue() {
  const path = join(HOME, '.openclaw/workspace/analytics/revenue.json');
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf-8'));
    }
  } catch { /* fall through */ }
  return { month: null, ccc: {}, ai_marvels: {}, emergestack: {} };
}

// --- Content pipeline: local JSON file ---
function readContentPipeline() {
  const path = join(HOME, '.openclaw/workspace/content/pipeline.json');
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf-8'));
    }
  } catch { /* fall through */ }
  return { month: null, items: [] };
}

// --- Crons: openclaw CLI ---
function readCrons() {
  try {
    const raw = execSync('openclaw cron list --json 2>/dev/null || echo "[]"', {
      timeout: 5000,
      encoding: 'utf-8',
    });
    const crons = JSON.parse(raw.trim() || '[]');
    if (Array.isArray(crons)) {
      return {
        total: crons.length,
        active: crons.filter((c: { active?: boolean; status?: string }) => c.active !== false && c.status !== 'disabled').length,
      };
    }
  } catch { /* fall through */ }
  return { total: 0, active: 0 };
}

export async function GET() {
  try {
    const sessions = parseSessionStats();
    const revenue = readRevenue();
    const content = readContentPipeline();
    const crons = readCrons();

    return NextResponse.json({
      sessions: {
        count: sessions.sessionCount ?? 0,
        totalMessages: sessions.totalMessages,
        totalToolCalls: sessions.totalToolCalls,
        totalTokens: sessions.totalTokens,
        totalCost: Math.round(sessions.totalCost * 10000) / 10000,
      },
      revenue,
      content: {
        month: content.month,
        total: Array.isArray(content.items) ? content.items.length : 0,
        items: Array.isArray(content.items) ? content.items.slice(0, 20) : [],
      },
      crons,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
