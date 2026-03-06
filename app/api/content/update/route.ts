import { writeFileSync } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { readPipeline, getPipelinePath, type ContentItem } from '../route';

interface UpdateBody {
  id?: string;
  fields?: Partial<ContentItem>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as UpdateBody;
    const { id, fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const pipeline = readPipeline();
    const idx = pipeline.items.findIndex((i) => i.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const prev = pipeline.items[idx];
    const updated: ContentItem = {
      ...prev,
      ...fields,
      id: prev.id,
      updatedAt: Date.now(),
    };

    if (fields?.status === 'published' && prev.status !== 'published') {
      updated.publishedAt = Date.now();
    }

    pipeline.items[idx] = updated;
    writeFileSync(getPipelinePath(), JSON.stringify(pipeline, null, 2), 'utf-8');

    return NextResponse.json(updated);
  } catch (error) {
    console.error('content/update error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}
