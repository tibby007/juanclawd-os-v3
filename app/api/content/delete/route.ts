import { writeFileSync } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { readPipeline, getPipelinePath } from '../route';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { id?: string };
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const pipeline = readPipeline();
    const before = pipeline.items.length;
    pipeline.items = pipeline.items.filter((i) => i.id !== id);

    if (pipeline.items.length === before) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    writeFileSync(getPipelinePath(), JSON.stringify(pipeline, null, 2), 'utf-8');

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('content/delete error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
