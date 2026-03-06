// GET /api/soul/agent-files - List agent-specific files
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const AGENTS_DIR = path.join(
  process.env.HOME || "/Users/juanclawdbot",
  ".openclaw/agents"
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId") || "main";

    const agentDir = path.join(AGENTS_DIR, agentId, "agent");

    try {
      const entries = await fs.readdir(agentDir, { withFileTypes: true });
      const files = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(agentDir, entry.name);
          const stat = await fs.stat(filePath);

          // Only include relevant config files
          const RELEVANT_FILES = [
            "models.json",
            "auth-profiles.json",
            "SOUL.md",
            "RULES.md",
            "TOOLS.md",
          ];

          if (RELEVANT_FILES.includes(entry.name) || entry.name.endsWith(".json")) {
            const content = await fs.readFile(filePath, "utf-8");
            files.push({
              name: entry.name,
              content,
              lastModified: stat.mtime.toISOString(),
              size: stat.size,
              path: filePath,
            });
          }
        }
      }

      return NextResponse.json({
        agentId,
        agentDir,
        files,
      });
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return NextResponse.json({
          agentId,
          agentDir,
          files: [],
          warning: `Agent directory does not exist: ${agentDir}`,
        });
      }
      throw err;
    }
  } catch (error: any) {
    console.error("Failed to list agent files:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list agent files" },
      { status: 500 }
    );
  }
}
