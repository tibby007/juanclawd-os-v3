import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { readPipeline, getPipelinePath, type ContentItem } from '../route';

interface CreateBody {
  title?: string;
  body?: string;
  type?: string;
  platform?: string;
  business?: string;
  status?: ContentItem['status'];
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateBody;
    const { title, body: postBody = '', type = 'social_post', platform = 'linkedin', business = 'ai_marvels', status = 'draft', notes = '' } = body;

    if (!title) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 });
    }

    const pipeline = readPipeline();

    const newItem: ContentItem = {
      id: randomUUID(),
      title,
      body: postBody,
      type,
      platform,
      business,
      status,
      notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      publishedAt: null,
    };

    pipeline.items.push(newItem);

    const path = getPipelinePath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(pipeline, null, 2), 'utf-8');

    return NextResponse.json(newItem);
  } catch (error) {
    console.error('content/create error:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
