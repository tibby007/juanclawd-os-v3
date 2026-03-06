// POST /api/config/raw/save - Save raw openclaw.json with validation
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const OPENCLAW_CONFIG = path.join(
  process.env.HOME || "/Users/juanclawdbot",
  ".openclaw/openclaw.json"
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, action } = body;

    if (!content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    // Validate JSON before saving
    try {
      JSON.parse(content);
    } catch (parseError: any) {
      return NextResponse.json(
        {
          error: "Invalid JSON",
          details: parseError.message,
          line: parseError.message.match(/position (\d+)/)?.[1],
        },
        { status: 400 }
      );
    }

    // Create backup
    const backupPath = OPENCLAW_CONFIG + ".bak";
    try {
      await fs.access(OPENCLAW_CONFIG);
      await fs.copyFile(OPENCLAW_CONFIG, backupPath);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }

    // Write new content
    await fs.writeFile(OPENCLAW_CONFIG, content, "utf-8");

    const stat = await fs.stat(OPENCLAW_CONFIG);

    return NextResponse.json({
      success: true,
      path: OPENCLAW_CONFIG,
      size: stat.size,
      lastModified: stat.mtime.toISOString(),
      backup: backupPath,
      message: "Configuration saved successfully. Restart gateway to apply changes.",
    });
  } catch (error: any) {
    console.error("Failed to save openclaw.json:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save configuration" },
      { status: 500 }
    );
  }
}

// POST /api/config/raw/revert - Revert to backup
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action !== "revert") {
      return NextResponse.json(
        { error: "Use action: revert" },
        { status: 400 }
      );
    }

    const backupPath = OPENCLAW_CONFIG + ".bak";

    try {
      await fs.access(backupPath);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return NextResponse.json(
          { error: "No backup file found" },
          { status: 404 }
        );
      }
      throw err;
    }

    // Read backup
    const backupContent = await fs.readFile(backupPath, "utf-8");

    // Validate backup JSON
    try {
      JSON.parse(backupContent);
    } catch (parseError: any) {
      return NextResponse.json(
        { error: "Backup file contains invalid JSON", details: parseError.message },
        { status: 500 }
      );
    }

    // Create backup of current before reverting
    try {
      await fs.access(OPENCLAW_CONFIG);
      await fs.copyFile(OPENCLAW_CONFIG, OPENCLAW_CONFIG + ".pre-revert");
    } catch (err: any) {
      // Current file doesn't exist, that's ok
    }

    // Restore from backup
    await fs.writeFile(OPENCLAW_CONFIG, backupContent, "utf-8");

    return NextResponse.json({
      success: true,
      message: "Reverted to backup",
      backup: backupPath,
    });
  } catch (error: any) {
    console.error("Failed to revert configuration:", error);
    return NextResponse.json(
      { error: error.message || "Failed to revert configuration" },
      { status: 500 }
    );
  }
}
