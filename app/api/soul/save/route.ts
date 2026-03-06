// POST /api/soul/save - Save a soul file with backup
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || "/Users/juanclawdbot/.openclaw/workspace";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, content } = body;

    if (!filename || content === undefined) {
      return NextResponse.json(
        { error: "filename and content are required" },
        { status: 400 }
      );
    }

    // Security: only allow specific files
    const ALLOWED_FILES = [
      "SOUL.md",
      "RULES.md",
      "GOALS.md",
      "AGENTS.md",
      "TOOLS.md",
      "MEMORY.md",
      "WORKING.md",
    ];

    if (!ALLOWED_FILES.includes(filename)) {
      return NextResponse.json(
        { error: "File not allowed for editing" },
        { status: 403 }
      );
    }

    // Validate filename (no path traversal)
    if (filename.includes("/") || filename.includes("..")) {
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 }
      );
    }

    const filePath = path.join(WORKSPACE_DIR, filename);
    const backupPath = filePath + ".bak";

    // Create backup if file exists
    try {
      await fs.access(filePath);
      await fs.copyFile(filePath, backupPath);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        throw err;
      }
      // File doesn't exist, no backup needed
    }

    // Write new content
    await fs.writeFile(filePath, content, "utf-8");

    const stat = await fs.stat(filePath);

    return NextResponse.json({
      success: true,
      filename,
      size: stat.size,
      lastModified: stat.mtime.toISOString(),
      backup: backupPath,
      message: `Saved ${filename} (backup created)`,
    });
  } catch (error: any) {
    console.error("Failed to save soul file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save file" },
      { status: 500 }
    );
  }
}
