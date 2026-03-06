// GET /api/credentials - List credential status (without exposing values)
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const ENV_FILE = path.join(
  process.env.HOME || "/Users/juanclawdbot",
  ".openclaw/.env"
);

const CONFIG_FILE = path.join(
  process.env.HOME || "/Users/juanclawdbot",
  ".openclaw/openclaw.json"
);

interface CredentialEntry {
  name: string;
  source: ".env" | "openclaw.json" | "keychain" | "env";
  exists: boolean;
  lastModified?: string;
  warning?: string;
}

export async function GET(request: NextRequest) {
  const credentials: CredentialEntry[] = [];

  try {
    // Check .env file
    try {
      const envContent = await fs.readFile(ENV_FILE, "utf-8");
      const envStat = await fs.stat(ENV_FILE);

      // Extract credential names (not values)
      const envKeys = envContent
        .split("\n")
        .map((line) => line.split("=")[0].trim())
        .filter((key) => key && !key.startsWith("#"));

      envKeys.forEach((key) => {
        credentials.push({
          name: key,
          source: ".env",
          exists: true,
          lastModified: envStat.mtime.toISOString(),
        });
      });
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        console.error("Error reading .env:", err);
      }
    }

    // Check openclaw.json for embedded credentials
    try {
      const configContent = await fs.readFile(CONFIG_FILE, "utf-8");
      const configStat = await fs.stat(CONFIG_FILE);
      const config = JSON.parse(configContent);

      // Check for env section in openclaw.json
      if (config.env) {
        Object.keys(config.env).forEach((key) => {
          // Skip if already in .env
          const alreadyExists = credentials.some((c) => c.name === key);
          if (!alreadyExists) {
            credentials.push({
              name: key,
              source: "openclaw.json",
              exists: true,
              lastModified: configStat.mtime.toISOString(),
              warning: "Consider moving to .env file",
            });
          }
        });
      }

      // Check agents for skill-specific credentials
      if (config.agents?.list) {
        config.agents.list.forEach((agent: any) => {
          if (agent.skillEntries) {
            Object.keys(agent.skillEntries).forEach((skill) => {
              const skillCreds = agent.skillEntries[skill].env || {};
              Object.keys(skillCreds).forEach((key) => {
                const alreadyExists = credentials.some((c) => c.name === key);
                if (!alreadyExists) {
                  credentials.push({
                    name: `${agent.name}.${skill}.${key}`,
                    source: "openclaw.json",
                    exists: true,
                    lastModified: configStat.mtime.toISOString(),
                    warning: "Skill-specific credential",
                  });
                }
              });
            });
          }
        });
      }
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        console.error("Error reading openclaw.json:", err);
      }
    }

    // Check process.env for runtime credentials
    const commonEnvVars = [
      "OPENAI_API_KEY",
      "ANTHROPIC_API_KEY",
      "Z_API_KEY",
      "BRAVE_API_KEY",
      "GITHUB_TOKEN",
      "N8N_API_KEY",
      "SUPABASE_SERVICE_KEY",
      "VOYAGE_API_KEY",
    ];

    commonEnvVars.forEach((key) => {
      const alreadyExists = credentials.some((c) => c.name === key);
      if (!alreadyExists && process.env[key]) {
        credentials.push({
          name: key,
          source: "env",
          exists: true,
          warning: "Runtime environment variable",
        });
      }
    });

    // Sort by name
    credentials.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ credentials });
  } catch (error: any) {
    console.error("Failed to list credentials:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list credentials" },
      { status: 500 }
    );
  }
}
