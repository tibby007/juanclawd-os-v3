import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { NextResponse } from 'next/server';

export interface ContentItem {
  id: string;
  title: string;
  body: string;
  type: string;
  platform: string;
  business: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  notes: string;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
}

export interface Pipeline {
  items: ContentItem[];
}

export function getPipelinePath(): string {
  return join(homedir(), '.openclaw', 'workspace', 'content', 'pipeline.json');
}

export function readPipeline(): Pipeline {
  const path = getPipelinePath();
  if (!existsSync(path)) return { items: [] };
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw) as Pipeline;
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

export async function GET() {
  try {
    const pipeline = readPipeline();
    const grouped = {
      draft: pipeline.items.filter((i) => i.status === 'draft'),
      review: pipeline.items.filter((i) => i.status === 'review'),
      approved: pipeline.items.filter((i) => i.status === 'approved'),
      published: pipeline.items.filter((i) => i.status === 'published'),
    };
    return NextResponse.json({ items: pipeline.items, grouped });
  } catch (error) {
    console.error('content GET error:', error);
    return NextResponse.json({ error: 'Failed to read pipeline' }, { status: 500 });
  }
}
