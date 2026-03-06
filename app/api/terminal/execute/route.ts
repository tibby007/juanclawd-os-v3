// POST /api/terminal/execute - Execute a shell command
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const DANGEROUS_PATTERNS = [
  /^rm\s+-(rf?|--recursive|--force)/,
  /^dd\s+/,
  /^mkfs/,
  /^chmod\s+777/,
  /^curl.*\|\s*(bash|sh)/,
  /^wget.*\|\s*(bash|sh)/,
];

const ALLOWED_COMMANDS = [
  'ls', 'cd', 'pwd', 'cat', 'head', 'tail', 'grep', 'find', 'ps', 'top', 'df', 'du',
  'vm_stat', 'uptime', 'whoami', 'hostname', 'uname', 'node', 'npm', 'npx', 'git',
  'openclaw', 'trash', 'mkdir', 'cp', 'mv', 'touch', 'echo', 'date', 'wc', 'sort',
  'uniq', 'cut', 'awk', 'sed', 'jq', 'curl', 'ping', 'netstat', 'lsof', 'pgrep',
  'pkill', 'kill', 'export', 'printenv', 'env',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command } = body;

    if (!command) {
      return NextResponse.json({ error: 'command is required' }, { status: 400 });
    }

    const trimmedCommand = command.trim();

    // Block dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(trimmedCommand)) {
        return NextResponse.json({ error: 'Command blocked for security' }, { status: 403 });
      }
    }

    const baseCommand = trimmedCommand.split(/\s+/)[0];
    if (!ALLOWED_COMMANDS.includes(baseCommand) && !baseCommand.includes('/')) {
      return NextResponse.json({ error: `Command not allowed: ${baseCommand}` }, { status: 403 });
    }

    const timeout = 30000;
    const cwd = process.env.HOME || '/Users/juanclawdbot';

    try {
      const { stdout, stderr } = await execAsync(trimmedCommand, {
        cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      return NextResponse.json({
        command,
        output: stdout || stderr || '(no output)',
        exitCode: 0,
      });
    } catch (execError: any) {
      return NextResponse.json({
        command,
        output: execError.stdout || '',
        error: execError.stderr || execError.message,
        exitCode: execError.code || 1,
      });
    }
  } catch (error: any) {
    console.error('Failed to execute command:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute command' }, { status: 500 });
  }
}
