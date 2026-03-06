// GET /api/soul/files - List workspace soul files
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || "/Users/juanclawdbot/.openclaw/workspace";
const SOUL_FILES = [
  "SOUL.md",
  "RULES.md",
  "GOALS.md",
  "AGENTS.md",
  "TOOLS.md",
  "MEMORY.md",
  "WORKING.md",
];

export async function GET(request: NextRequest) {
  try {
    const files = [];

    for (const filename of SOUL_FILES) {
      try {
        const filePath = path.join(WORKSPACE_DIR, filename);
        const stat = await fs.stat(filePath);
        const content = await fs.readFile(filePath, "utf-8");

        files.push({
          name: filename,
          content,
          lastModified: stat.mtime.toISOString(),
          size: stat.size,
        });
      } catch (err: any) {
        if (err.code !== "ENOENT") {
          console.error(`Error reading ${filename}:`, err);
        }
        // File doesn't exist, skip it
      }
    }

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error("Failed to list soul files:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list soul files" },
      { status: 500 }
    );
  }
}
