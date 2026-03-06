// POST /api/terminal/execute - Execute a shell command
import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Dangerous patterns to block
const DANGEROUS_PATTERNS = [
  /^rm\s+-(rf?|--recursive|--force)/, // rm -rf without trash
  /^dd\s+/, // dd command
  /^mkfs/, // filesystem creation
  /^chmod\s+777/, // overly permissive chmod
  /^curl.*\|\s*(bash|sh)/, // curl pipe to shell
  /^wget.*\|\s*(bash|sh)/, // wget pipe to shell
  /:\(\)\{\s*:\|:\s*&\s*\}\s*;/, // fork bomb
  /\bdev\/null\b/, // redirecting to /dev/null suspiciously
];

// Allowed base commands
const ALLOWED_COMMANDS = [
  "ls",
  "cd",
  "pwd",
  "cat",
  "head",
  "tail",
  "grep",
  "find",
  "ps",
  "top",
  "df",
  "du",
  "free",
  "vm_stat",
  "uptime",
  "whoami",
  "hostname",
  "uname",
  "node",
  "npm",
  "npx",
  "git",
  "openclaw",
  "trash",
  "mkdir",
  "cp",
  "mv",
  "touch",
  "echo",
  "date",
  "cal",
  "wc",
  "sort",
  "uniq",
  "cut",
  "awk",
  "sed",
  "jq",
  "curl",
  "wget",
  "ping",
  "netstat",
  "lsof",
  "pgrep",
  "pkill",
  "kill",
  "export",
  "printenv",
  "env",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command } = body;

    if (!command) {
      return NextResponse.json(
        { error: "command is required" },
        { status: 400 }
      );
    }

    // Security checks
    const trimmedCommand = command.trim();

    // Block dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(trimmedCommand)) {
        return NextResponse.json(
          { error: `Command blocked for security: matches dangerous pattern` },
          { status: 403 }
        );
      }
    }

    // Extract base command (first word)
    const baseCommand = trimmedCommand.split(/\s+/)[0];

    // Allow common prefixes and shell features
    const allowedPrefixes = ["sudo", "cd", ".", "source"];
    const isAllowedPrefix = allowedPrefixes.some((prefix) =>
      trimmedCommand.startsWith(prefix)
    );

    // Check if base command is allowed (or uses allowed prefix)
    if (!isAllowedPrefix && !ALLOWED_COMMANDS.includes(baseCommand)) {
      // Allow paths and relative commands
      if (!baseCommand.includes("/") && baseCommand !== "bash" && baseCommand !== "sh") {
        return NextResponse.json(
          { error: `Command not allowed: ${baseCommand}. Use allowed commands only.` },
          { status: 403 }
        );
      }
    }

    // Block bash/sh directly unless it's a specific script
    if ((baseCommand === "bash" || baseCommand === "sh") && !trimmedCommand.includes(".sh")) {
      return NextResponse.json(
        { error: "Direct bash/sh execution not allowed. Run scripts instead." },
        { status: 403 }
      );
    }

    // Set timeout (30 seconds max)
    const timeout = 30000;

    // Execute command
    const cwd = process.env.HOME || "/Users/juanclawdbot";

    try {
      const { stdout, stderr } = await execAsync(trimmedCommand, {
        cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB max output
        env: { ...process.env, FORCE_COLOR: "0" }, // Disable ANSI colors
      });

      return NextResponse.json({
        command,
        output: stdout || stderr || "(no output)",
        exitCode: 0,
      });
    } catch (execError: any) {
      // Command executed but returned non-zero exit code
      return NextResponse.json({
        command,
        output: execError.stdout || "",
        error: execError.stderr || execError.message,
        exitCode: execError.code || 1,
        killed: execError.killed,
      });
    }
  } catch (error: any) {
    console.error("Failed to execute command:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute command" },
      { status: 500 }
    );
  }
}
