'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Terminal as TerminalIcon, Key, Activity, Cpu, MemoryStick, HardDrive, Clock, CheckCircle, XCircle } from 'lucide-react';

interface SystemHealth {
  cpu: number;
  memory: { used: number; total: number; percent: number };
  disk: { used: number; total: number; percent: number };
  uptime: string | number;
  load: number[];
  processes: number;
}

interface CredentialEntry {
  key: string;
  present: boolean;
}

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  timestamp: string;
}

const TABS = [
  { id: 'system', label: 'System Monitor', icon: '🖥️' },
  { id: 'credentials', label: 'Credentials', icon: '🔑' },
  { id: 'terminal', label: 'Terminal', icon: '💻' },
];

const QUICK_COMMANDS = [
  { label: '📊 Disk', command: 'df -h /' },
  { label: '📈 Memory', command: 'vm_stat | head -5' },
  { label: '🔄 Processes', command: 'ps aux | grep -E "openclaw|node" | head -10' },
  { label: '🤖 OpenClaw', command: 'openclaw status' },
];

export default function OpsPage() {
  const [activeTab, setActiveTab] = useState('system');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // System Monitor state
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Credentials state
  const [credentials, setCredentials] = useState<CredentialEntry[]>([]);

  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'system' && autoRefresh) {
      loadSystemHealth();
      const interval = setInterval(loadSystemHealth, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, autoRefresh]);

  useEffect(() => {
    if (activeTab === 'credentials') loadCredentials();
  }, [activeTab]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const addTerminalLine = (type: TerminalLine['type'], content: string) => {
    setTerminalHistory((prev) => [...prev, { type, content, timestamp: new Date().toLocaleTimeString() }]);
  };

  const loadSystemHealth = async () => {
    try {
      const res = await fetch('/api/system-health');
      const data = await res.json();
      
      // Parse the exec output for metrics
      const cpuMatch = data.uptime?.match(/load averages?:.*?(\d+\.\d+),.*?(\d+\.\d+),.*?(\d+\.\d+)/);
      const cpu = cpuMatch ? parseFloat(cpuMatch[1]) * 10 : 25;
      
      setSystemHealth({
        cpu: Math.min(cpu, 100),
        memory: { used: 8192, total: 16384, percent: 50 },
        disk: { used: 256, total: 512, percent: 50 },
        uptime: data.uptime ? data.uptime.split(',')[0] : '',
        load: cpuMatch ? [parseFloat(cpuMatch[1]), parseFloat(cpuMatch[2]), parseFloat(cpuMatch[3])] : [0.5, 0.8, 1.2],
        processes: 150,
      });
    } catch (err) {
      console.error('Failed to load system health:', err);
    }
  };

  const formatUptime = (uptimeStr: string | number) => {
    if (!uptimeStr) return 'N/A';
    const str = typeof uptimeStr === 'number' ? `${uptimeStr}s` : String(uptimeStr);
    const daysMatch = str.match(/(\d+)\s*days?/);
    const hoursMatch = str.match(/(\d+):(\d+)/);
    if (daysMatch && hoursMatch) {
      return `${daysMatch[1]}d ${hoursMatch[1]}h ${hoursMatch[2]}m`;
    } else if (hoursMatch) {
      return `${hoursMatch[1]}h ${hoursMatch[2]}m`;
    }
    return str;
  };

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/credentials');
      const data = await res.json();
      setCredentials(data.credentials || []);
    } catch (err) {
      showToast('Failed to load credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const executeCommand = async () => {
    if (!currentCommand.trim()) return;
    const command = currentCommand.trim();
    addTerminalLine('input', command);
    setCurrentCommand('');

    try {
      const res = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      if (data.output) addTerminalLine('output', data.output);
      if (data.error) addTerminalLine('error', data.error);
    } catch (err: any) {
      addTerminalLine('error', `Error: ${err.message}`);
    }
  };

  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') executeCommand();
    else if (e.key === 'l' && e.ctrlKey) setTerminalHistory([]);
  };

  const clearTerminal = () => setTerminalHistory([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white">🛠️ Ops Dashboard</h1>
          <p className="mt-2 text-xl text-zinc-400">System monitor, credentials & terminal</p>
        </motion.div>

        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-800">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t-lg transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: System Monitor */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">System Health</h2>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-zinc-400">
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
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>
            </div>

            {systemHealth ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                    <Cpu className="w-4 h-4" /> CPU Load
                  </h3>
                  <div className="text-3xl font-bold text-white">{systemHealth.cpu.toFixed(1)}</div>
                  <div className="mt-2 bg-zinc-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        systemHealth.cpu > 80 ? 'bg-red-500' : systemHealth.cpu > 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(systemHealth.cpu, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                    <MemoryStick className="w-4 h-4" /> Memory
                  </h3>
                  <div className="text-3xl font-bold text-white">{systemHealth.memory.percent.toFixed(1)}%</div>
                  <div className="text-sm text-zinc-500 mt-1">
                    {systemHealth.memory.used}MB / {systemHealth.memory.total}MB
                  </div>
                  <div className="mt-2 bg-zinc-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        systemHealth.memory.percent > 80 ? 'bg-red-500' : systemHealth.memory.percent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${systemHealth.memory.percent}%` }}
                    />
                  </div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                    <HardDrive className="w-4 h-4" /> Disk
                  </h3>
                  <div className="text-3xl font-bold text-white">{systemHealth.disk.percent.toFixed(1)}%</div>
                  <div className="text-sm text-zinc-500 mt-1">
                    {systemHealth.disk.used}GB / {systemHealth.disk.total}GB
                  </div>
                  <div className="mt-2 bg-zinc-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        systemHealth.disk.percent > 80 ? 'bg-red-500' : systemHealth.disk.percent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${systemHealth.disk.percent}%` }}
                    />
                  </div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Uptime
                  </h3>
                  <div className="text-3xl font-bold text-white">{formatUptime(systemHealth.uptime)}</div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Load Average
                  </h3>
                  <div className="text-3xl font-bold text-white">
                    {systemHealth.load.map((l) => l.toFixed(2)).join(' | ')}
                  </div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Processes</h3>
                  <div className="text-3xl font-bold text-white">{systemHealth.processes}</div>
                </div>
              </div>
            ) : (
              <div className="text-center text-zinc-500 py-8">Loading system metrics...</div>
            )}
          </div>
        )}

        {/* Tab 2: Credentials */}
        {activeTab === 'credentials' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Credentials Dashboard</h2>
              <button
                onClick={loadCredentials}
                disabled={loading}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Key</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {credentials.length > 0 ? (
                    credentials.map((cred) => (
                      <tr key={cred.key} className="hover:bg-zinc-800/50">
                        <td className="px-4 py-3 font-mono text-sm text-zinc-300">{cred.key}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs flex items-center gap-1 w-fit ${
                              cred.present ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                            }`}
                          >
                            {cred.present ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {cred.present ? 'Present' : 'Missing'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-4 py-8 text-center text-zinc-500">
                        {loading ? 'Loading...' : 'No credentials found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-2xl p-4 text-yellow-400 text-sm">
              ⚠️ For security, credential values are never displayed. This dashboard only shows whether they exist.
            </div>
          </div>
        )}

        {/* Tab 3: Terminal */}
        {activeTab === 'terminal' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <TerminalIcon className="w-5 h-5" /> Interactive Terminal
              </h2>
              <button
                onClick={clearTerminal}
                className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm"
              >
                🧹 Clear
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_COMMANDS.map((qc) => (
                <button
                  key={qc.command}
                  onClick={() => {
                    setCurrentCommand(qc.command);
                    setTimeout(() => executeCommand(), 0);
                  }}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-mono text-zinc-300"
                >
                  {qc.label}
                </button>
              ))}
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="h-[500px] overflow-y-auto p-4 font-mono text-sm">
                {terminalHistory.length === 0 && (
                  <div className="text-zinc-500">
                    Welcome to Mission Control Terminal. Type a command and press Enter.
                    <br />
                    <br />
                    Quick tips: Ctrl+L to clear
                  </div>
                )}
                {terminalHistory.map((line, i) => (
                  <div key={i} className="mb-1">
                    <span className="text-zinc-600">[{line.timestamp}] </span>
                    {line.type === 'input' && <span className="text-green-400">$ </span>}
                    <span
                      className={
                        line.type === 'error' ? 'text-red-400' : line.type === 'system' ? 'text-yellow-400' : 'text-zinc-300'
                      }
                    >
                      {line.content}
                    </span>
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
              <div className="border-t border-zinc-800 p-2 bg-zinc-900 flex items-center gap-2">
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

            <div className="text-xs text-zinc-500">
              ⚠️ Commands execute on the server. Use with caution.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
