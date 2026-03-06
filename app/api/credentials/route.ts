import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { NextResponse } from 'next/server';

const EXPECTED_KEYS = [
  'INSTANTLY_API_KEY',
  'GOOGLE_OAUTH_TOKEN',
  'APIFY_API_TOKEN',
  'TOMBA_API_KEY',
  'OPENCLAW_AUTH_TOKEN',
  'CALENDLY_API_TOKEN',
  'SUPABASE_CCC_SERVICE_KEY',
  'BRAVE_API_KEY',
  'ZAI_API_KEY',
  'OPENAI_API_KEY',
  'N8N_API_KEY',
  'GITHUB_TOKEN',
  'VERCEL_TOKEN',
  'OPENROUTER_API_KEY',
  'ANTHROPIC_API_KEY',
];

export async function GET() {
  try {
    const envPath = `${homedir()}/.openclaw/.env`;
    if (!existsSync(envPath)) {
      return NextResponse.json({
        credentials: EXPECTED_KEYS.map((k) => ({ key: k, present: false })),
      });
    }

    const envContent = readFileSync(envPath, 'utf-8');
    const credentials = EXPECTED_KEYS.map((key) => ({
      key,
      present:
        envContent.includes(`${key}=`) &&
        !envContent.match(new RegExp(`${key}=\\n`)) &&
        !envContent.includes(`${key}=""`),
    }));

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error('Failed to read credentials:', error);
    return NextResponse.json({ error: 'Failed to read credentials' }, { status: 500 });
  }
}
