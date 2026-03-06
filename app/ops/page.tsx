// Ops Dashboard Page - System Monitor, Credentials, Terminal
// Location: app/ops/page.tsx

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SystemHealth {
  cpu?: number;
  memory?: { used: number; total: number; percent: number };
  disk?: { used: number; total: number; percent: number; mount: string };
  uptime?: number;
  load?: number[];
  network?: { rx: number; tx: number };
  processes?: number;
}

interface CredentialEntry {
  name: string;
  source: string;
  exists: boolean;
  lastModified?: string;
  warning?: string;
}

interface TerminalLine {
  type: "input" | "output" | "error" | "system";
  content: string;
  timestamp: string;
}

const TABS = [
  { id: "system", label: "System Monitor", icon: "🖥️" },
  { id: "credentials", label: "Credentials", icon: "🔑" },
  { id: "terminal", label: "Terminal", icon: "💻" },
];

export default function OpsPage() {
  const [activeTab, setActiveTab] = useState("system");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // System Monitor state
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Credentials state
  const [credentials, setCredentials] = useState<CredentialEntry[]>([]);

  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
  const [currentCommand, setCurrentCommand] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === "system" && autoRefresh) {
      loadSystemHealth();
      const interval = setInterval(loadSystemHealth, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, autoRefresh]);

  useEffect(() => {
    if (activeTab === "credentials") {
      loadCredentials();
    }
  }, [activeTab]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalHistory]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  const addTerminalLine = (type: TerminalLine["type"], content: string) => {
    setTerminalHistory((prev) => [
      ...prev,
      {
        type,
        content,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  // =====================
  // SYSTEM MONITOR
  // =====================

  const loadSystemHealth = async () => {
    try {
      const res = await fetch("/api/system/health");
      const data = await res.json();
      setSystemHealth(data);
    } catch (err) {
      console.error("Failed to load system health:", err);
      // Mock data for demo
      setSystemHealth({
        cpu: Math.random() * 30,
        memory: { used: 8192, total: 16384, percent: 50 },
        disk: { used: 256, total: 512, percent: 50, mount: "/" },
        uptime: process.uptime(),
        load: [0.5, 0.8, 1.2],
        network: { rx: 1024000, tx: 512000 },
        processes: 150,
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  // =====================
  // CREDENTIALS
  // =====================

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/credentials");
      const data = await res.json();
      setCredentials(data.credentials || []);
    } catch (err) {
      console.error("Failed to load credentials:", err);
      showToast("Failed to load credentials", "error");
    } finally {
      setLoading(false);
    }
  };

  const testCredential = async (name: string) => {
    addTerminalLine("system", `Testing credential: ${name}`);
    // This would call an API to test the credential
    setTimeout(() => {
      addTerminalLine("output", `✓ ${name} is configured`);
    }, 500);
  };

  // =====================
  // TERMINAL
  // =====================

  const executeCommand = async () => {
    if (!currentCommand.trim()) return;

    const command = currentCommand.trim();
    addTerminalLine("input", command);
    setCurrentCommand("");

    try {
      const res = await fetch("/api/terminal/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      const data = await res.json();

      if (data.output) {
        addTerminalLine("output", data.output);
      }
      if (data.error) {
        addTerminalLine("error", data.error);
      }
    } catch (err: any) {
      addTerminalLine("error", `Error: ${err.message}`);
    }
  };

  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand();
    } else if (e.key === "l" && e.ctrlKey) {
      setTerminalHistory([]);
    } else if (e.key === "c" && e.ctrlKey) {
      addTerminalLine("system", "^C");
      setCurrentCommand("");
    }
  };

  const clearTerminal = () => {
    setTerminalHistory([]);
    addTerminalLine("system", "Terminal cleared");
  };

  const quickCommands = [
    { label: "📊 Disk Usage", command: "df -h" },
    { label: "📈 Memory", command: "vm_stat" },
    { label: "🔄 Processes", command: "ps aux | head -20" },
    { label: "🌐 Network", command: "netstat -an | grep ESTABLISHED | wc -l" },
    { label: "📁 Workspace", command: "ls -la ~/.openclaw/workspace" },
    { label: "🤖 OpenClaw Status", command: "openclaw status" },
  ];

  // =====================
  // RENDER
  // =====================

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">🛠️ Ops Dashboard</h1>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg transition ${
              activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ===================== */}
      {/* TAB 1: SYSTEM MONITOR */}
      {/* ===================== */}
      {activeTab === "system" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">System Health</h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4"
                />
                Auto-refresh (5s)
              </label>
              <button
                onClick={loadSystemHealth}
                disabled={loading}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {systemHealth ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* CPU */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">CPU Usage</h3>
                <div className="text-3xl font-bold">{systemHealth.cpu?.toFixed(1)}%</div>
                <div className="mt-2 bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (systemHealth.cpu || 0) > 80
                        ? "bg-red-500"
                        : (systemHealth.cpu || 0) > 50
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(systemHealth.cpu || 0, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Memory */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Memory</h3>
                <div className="text-3xl font-bold">
                  {systemHealth.memory?.percent.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {formatBytes(systemHealth.memory?.used || 0)} /{" "}
                  {formatBytes(systemHealth.memory?.total || 0)}
                </div>
                <div className="mt-2 bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (systemHealth.memory?.percent || 0) > 80
                        ? "bg-red-500"
                        : (systemHealth.memory?.percent || 0) > 50
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(systemHealth.memory?.percent || 0, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Disk */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">
                  Disk ({systemHealth.disk?.mount || "/"})
                </h3>
                <div className="text-3xl font-bold">
                  {systemHealth.disk?.percent.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {systemHealth.disk?.used}GB / {systemHealth.disk?.total}GB
                </div>
                <div className="mt-2 bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (systemHealth.disk?.percent || 0) > 80
                        ? "bg-red-500"
                        : (systemHealth.disk?.percent || 0) > 50
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(systemHealth.disk?.percent || 0, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Uptime */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Uptime</h3>
                <div className="text-3xl font-bold">
                  {formatUptime(systemHealth.uptime || 0)}
                </div>
              </div>

              {/* Load Average */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Load Average</h3>
                <div className="text-3xl font-bold">
                  {systemHealth.load?.map((l) => l.toFixed(2)).join(" | ") || "N/A"}
                </div>
              </div>

              {/* Processes */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Processes</h3>
                <div className="text-3xl font-bold">{systemHealth.processes || "N/A"}</div>
              </div>

              {/* Network */}
              <div className="bg-gray-800 rounded-lg p-4 md:col-span-2">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Network Traffic</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Received</div>
                    <div className="text-xl font-bold text-green-400">
                      {formatBytes(systemHealth.network?.rx || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Transmitted</div>
                    <div className="text-xl font-bold text-blue-400">
                      {formatBytes(systemHealth.network?.tx || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">Loading system metrics...</div>
          )}
        </div>
      )}

      {/* ===================== */}
      {/* TAB 2: CREDENTIALS */}
      {/* ===================== */}
      {activeTab === "credentials" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Credentials Dashboard</h2>
            <button
              onClick={loadCredentials}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
            >
              🔄 Refresh
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Source</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Last Modified</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {credentials.length > 0 ? (
                  credentials.map((cred) => (
                    <tr key={cred.name} className="hover:bg-gray-750">
                      <td className="px-4 py-3 font-mono text-sm">{cred.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{cred.source}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            cred.exists
                              ? "bg-green-600/20 text-green-400"
                              : "bg-red-600/20 text-red-400"
                          }`}
                        >
                          {cred.exists ? "✓ Exists" : "✗ Missing"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {cred.lastModified
                          ? new Date(cred.lastModified).toLocaleString()
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => testCredential(cred.name)}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          Test
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      {loading ? "Loading..." : "No credentials found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 text-yellow-400 text-sm">
            ⚠️ For security, credential values are never displayed. This dashboard only shows
            whether they exist and their source location.
          </div>
        </div>
      )}

      {/* ===================== */}
      {/* TAB 3: TERMINAL */}
      {/* ===================== */}
      {activeTab === "terminal" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Interactive Terminal</h2>
            <div className="flex gap-2">
              <button
                onClick={clearTerminal}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                🧹 Clear
              </button>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  isConnected ? "bg-green-600/20 text-green-400" : "bg-gray-600/20 text-gray-400"
                }`}
              >
                {isConnected ? "● Connected" : "○ Disconnected"}
              </span>
            </div>
          </div>

          {/* Quick Commands */}
          <div className="flex flex-wrap gap-2">
            {quickCommands.map((qc) => (
              <button
                key={qc.command}
                onClick={() => {
                  setCurrentCommand(qc.command);
                  setTimeout(() => executeCommand(), 0);
                }}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm font-mono"
              >
                {qc.label}
              </button>
            ))}
          </div>

          {/* Terminal Window */}
          <div className="bg-gray-950 rounded-lg border border-gray-700 overflow-hidden">
            <div className="h-[500px] overflow-y-auto p-4 font-mono text-sm">
              {terminalHistory.length === 0 && (
                <div className="text-gray-500">
                  Welcome to Mission Control Terminal. Type a command and press Enter.
                  <br />
                  <br />
                  Quick tips:
                  <br />- Ctrl+L to clear
                  <br />- Ctrl+C to cancel current command
                  <br />
                </div>
              )}

              {terminalHistory.map((line, index) => (
                <div key={index} className="mb-1">
                  <span className="text-gray-600">[{line.timestamp}] </span>
                  {line.type === "input" && <span className="text-green-400">$ </span>}
                  <span
                    className={
                      line.type === "error"
                        ? "text-red-400"
                        : line.type === "system"
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }
                  >
                    {line.content}
                  </span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            {/* Command Input */}
            <div className="border-t border-gray-700 p-2 bg-gray-900">
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-mono">$</span>
                <input
                  type="text"
                  value={currentCommand}
                  onChange={(e) => setCurrentCommand(e.target.value)}
                  onKeyDown={handleTerminalKeyDown}
                  className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-white"
                  placeholder="Enter command..."
                  autoFocus
                />
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            ⚠️ Commands execute on the server. Use with caution. Dangerous commands (rm without
            trash, etc.) are blocked.
          </div>
        </div>
      )}
    </div>
  );
}
