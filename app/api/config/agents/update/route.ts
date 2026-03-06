// POST /api/config/agents/update - Update agent configuration
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const OPENCLAW_CONFIG = path.join(process.env.HOME || '/Users/juanclawdbot', '.openclaw/openclaw.json');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, agentId, agentData } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required (add, update, remove)' }, { status: 400 });
    }

    const configContent = await fs.readFile(OPENCLAW_CONFIG, 'utf-8');
    const config = JSON.parse(configContent);

    // Create backup
    const backupPath = OPENCLAW_CONFIG + '.bak';
    await fs.copyFile(OPENCLAW_CONFIG, backupPath);

    if (!config.agents) config.agents = { list: [] };
    if (!config.agents.list) config.agents.list = [];

    if (action === 'add') {
      if (!agentData || !agentData.name) {
        return NextResponse.json({ error: 'agentData with name is required for add' }, { status: 400 });
      }
      config.agents.list.push(agentData);
    } else if (action === 'update') {
      if (!agentId) {
        return NextResponse.json({ error: 'agentId is required for update' }, { status: 400 });
      }
      const index = config.agents.list.findIndex((a: any) => a.name === agentId);
      if (index === -1) {
        return NextResponse.json({ error: `Agent ${agentId} not found` }, { status: 404 });
      }
      config.agents.list[index] = { ...config.agents.list[index], ...agentData };
    } else if (action === 'remove') {
      if (!agentId) {
        return NextResponse.json({ error: 'agentId is required for remove' }, { status: 400 });
      }
      config.agents.list = config.agents.list.filter((a: any) => a.name !== agentId);
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be add, update, or remove' }, { status: 400 });
    }

    await fs.writeFile(OPENCLAW_CONFIG, JSON.stringify(config, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      action,
      agentId,
      backup: backupPath,
      message: `Agent ${action} successful. Restart gateway to apply: openclaw daemon restart`,
    });
  } catch (error: any) {
    console.error('Failed to update agent config:', error);
    return NextResponse.json({ error: error.message || 'Failed to update agent configuration' }, { status: 500 });
  }
}
