import { execSync } from 'child_process';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const uptime = execSync('uptime').toString().trim();
    const disk = execSync('df -h / | tail -1').toString().trim();
    const memory = execSync('vm_stat | head -10').toString().trim();
    const processes = execSync('ps aux | grep -E "openclaw|ollama|node" | grep -v grep').toString().trim();
    
    return NextResponse.json({ uptime, disk, memory, processes });
  } catch (error) {
    console.error('Failed to read system health:', error);
    return NextResponse.json({ error: 'Failed to read system health' }, { status: 500 });
  }
}
