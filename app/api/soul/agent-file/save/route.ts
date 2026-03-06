// POST /api/soul/agent-file/save - Save an agent-specific file
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const AGENTS_DIR = path.join(process.env.HOME || '/Users/juanclawdbot', '.openclaw/agents');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, filename, content } = body;

    if (!agentId || !filename || content === undefined) {
      return NextResponse.json({ error: 'agentId, filename, and content are required' }, { status: 400 });
    }

    if (filename.includes('/') || filename.includes('..')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const agentDir = path.join(AGENTS_DIR, agentId, 'agent');
    const filePath = path.join(agentDir, filename);
    const backupPath = filePath + '.bak';

    // Ensure directory exists
    try {
      await fs.access(agentDir);
    } catch (err: any) {
      if (err.code === 'ENOENT') await fs.mkdir(agentDir, { recursive: true });
    }

    // Create backup if file exists
    try {
      await fs.access(filePath);
      await fs.copyFile(filePath, backupPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    await fs.writeFile(filePath, content, 'utf-8');
    const stat = await fs.stat(filePath);

    return NextResponse.json({
      success: true,
      filename,
      agentId,
      size: stat.size,
      lastModified: stat.mtime.toISOString(),
      backup: backupPath,
      message: `Saved ${filename} for agent ${agentId}`,
    });
  } catch (error: any) {
    console.error('Failed to save agent file:', error);
    return NextResponse.json({ error: error.message || 'Failed to save agent file' }, { status: 500 });
  }
}
