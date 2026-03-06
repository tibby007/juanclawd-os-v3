'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Briefcase,
  Code2,
  Megaphone,
  PenTool,
  Settings2,
  ChevronDown,
  ChevronUp,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// ---------- Types ----------

interface AgentStatus {
  id: string;
  name: string;
  role: string;
  model: string;
  status: 'active' | 'idle' | 'offline' | 'failed';
  healthScore: number;
  errorCount: number;
  lastAction: string | null;
  sessionCount: number;
}

interface ErrorExample {
  message: string;
  timestamp: string;
}

interface ErrorPattern {
  keyword: string;
  count: number;
  examples: ErrorExample[];
}

interface ErrorData {
  summary: { total: number; trend: 'up' | 'down' | 'stable'; period: string };
  byAgent: Record<string, number>;
  patterns: ErrorPattern[];
}

// ---------- Constants ----------

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  COO: Briefcase,
  Coder: Code2,
  PM: Settings2,
  Marketing: Megaphone,
  Content: PenTool,
};

const STATUS_STYLES: Record<string, { label: string; dot: string; badge: string }> = {
  active:  { label: 'Active',  dot: 'bg-green-400',  badge: 'bg-green-500/20 text-green-400 border-green-500/30' },
  idle:    { label: 'Idle',    dot: 'bg-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  offline: { label: 'Offline', dot: 'bg-zinc-500',   badge: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/30' },
  failed:  { label: 'Failed',  dot: 'bg-red-400',    badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

function healthColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function formatTime(ts: string | null): string {
  if (!ts) return '\u2014';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '\u2014';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---------- Org Chart Node ----------

interface OrgNodeProps {
  name: string;
  role: string;
  model: string;
  agent?: AgentStatus;
  isCEO?: boolean;
  delay?: number;
}

function OrgNode({ name, role, model, agent, isCEO = false, delay = 0 }: OrgNodeProps) {
  const Icon = isCEO ? Crown : (ROLE_ICONS[role] ?? Briefcase);
  const st = agent ? STATUS_STYLES[agent.status] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`relative rounded-xl border p-4 backdrop-blur-xl min-w-[160px] max-w-[200px] ${
        isCEO
          ? 'border-amber-500/40 bg-gradient-to-br from-amber-900/30 to-orange-900/20'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            isCEO ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-violet-500/20'
          }`}
        >
          <Icon className={`h-5 w-5 ${isCEO ? 'text-white' : 'text-violet-400'}`} />
        </div>
        <div>
          <p className="text-sm font-bold text-white">{name}</p>
          <p className={`text-xs ${isCEO ? 'text-amber-400' : 'text-violet-400'}`}>{role}</p>
          <p className="text-xs text-zinc-500 mt-0.5 leading-tight">{model}</p>
        </div>
        {st && (
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${st.dot} ${agent?.status === 'active' ? 'animate-pulse' : ''}`} />
            <span className={`text-xs px-2 py-0.5 rounded-full border ${st.badge}`}>{st.label}</span>
          </div>
        )}
        {agent && (
          <div className="w-full">
            <div className="flex justify-between text-xs text-zinc-500 mb-1">
              <span>Health</span>
              <span>{agent.healthScore}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-zinc-700">
              <div
                className={`h-1 rounded-full transition-all ${healthColor(agent.healthScore)}`}
                style={{ width: `${agent.healthScore}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------- Status Card ----------

function AgentCard({ agent, delay }: { agent: AgentStatus; delay: number }) {
  const st = STATUS_STYLES[agent.status] ?? STATUS_STYLES['offline'];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-white text-lg">{agent.name}</h3>
          <p className="text-sm text-violet-400">{agent.role}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{agent.model}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border font-medium ${st.badge}`}>
          {st.label}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Health Score</span>
          <span className={
            agent.healthScore >= 80 ? 'text-green-400' :
            agent.healthScore >= 50 ? 'text-yellow-400' : 'text-red-400'
          }>{agent.healthScore}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-800">
          <div
            className={`h-2 rounded-full transition-all ${healthColor(agent.healthScore)}`}
            style={{ width: `${agent.healthScore}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-white/5 p-2">
          <p className="text-xs text-zinc-500">Errors 24h</p>
          <p className={`text-lg font-bold ${agent.errorCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {agent.errorCount}
          </p>
        </div>
        <div className="rounded-lg bg-white/5 p-2">
          <p className="text-xs text-zinc-500">Sessions</p>
          <p className="text-lg font-bold text-white">{agent.sessionCount}</p>
        </div>
        <div className="rounded-lg bg-white/5 p-2">
          <p className="text-xs text-zinc-500">Last Active</p>
          <p className="text-sm font-medium text-zinc-300">{formatTime(agent.lastAction)}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ---------- Failure Dashboard ----------

function FailureDashboard() {
  const [data24h, setData24h] = useState<ErrorData | null>(null);
  const [data7d, setData7d] = useState<ErrorData | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [r24, r7] = await Promise.all([
          fetch('/api/team/errors?range=24h').then((r) => r.json()),
          fetch('/api/team/errors?range=7d').then((r) => r.json()),
        ]);
        setData24h(r24 as ErrorData);
        setData7d(r7 as ErrorData);
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const trend = data24h?.summary.trend ?? 'stable';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-green-400' : 'text-zinc-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
    >
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="h-5 w-5 text-red-400" />
        <h2 className="text-xl font-bold text-white">Failure Dashboard</h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl bg-zinc-800/60 p-4 text-center">
              <p className="text-xs text-zinc-500 mb-1">Errors (24h)</p>
              <p className="text-3xl font-bold text-white">{data24h?.summary.total ?? 0}</p>
              <div className={`flex items-center justify-center gap-1 mt-1 ${trendColor}`}>
                <TrendIcon className="h-3 w-3" />
                <span className="text-xs capitalize">{trend}</span>
              </div>
            </div>
            <div className="rounded-xl bg-zinc-800/60 p-4 text-center">
              <p className="text-xs text-zinc-500 mb-1">Errors (7d)</p>
              <p className="text-3xl font-bold text-white">{data7d?.summary.total ?? 0}</p>
            </div>
            <div className="rounded-xl bg-zinc-800/60 p-4 text-center">
              <p className="text-xs text-zinc-500 mb-1">By Agent</p>
              <p className="text-sm font-medium text-zinc-300">
                {Object.entries(data24h?.byAgent ?? {})
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(', ') || 'None'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-zinc-400 mb-3">Error Patterns</p>
            {(data24h?.patterns ?? []).map((pattern) => (
              <div key={pattern.keyword} className="rounded-lg border border-white/5 overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === pattern.keyword ? null : pattern.keyword)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white">{pattern.keyword}</span>
                    {pattern.count > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                        {pattern.count}
                      </span>
                    )}
                  </div>
                  {pattern.count > 0 && (
                    expanded === pattern.keyword
                      ? <ChevronUp className="h-4 w-4 text-zinc-500" />
                      : <ChevronDown className="h-4 w-4 text-zinc-500" />
                  )}
                </button>
                <AnimatePresence>
                  {expanded === pattern.keyword && pattern.examples.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 space-y-2">
                        {pattern.examples.map((ex, i) => (
                          <div key={i} className="rounded-lg bg-zinc-900/60 p-3">
                            <p className="text-xs text-zinc-300 font-mono line-clamp-2">{ex.message}</p>
                            <p className="text-xs text-zinc-600 mt-1">{formatTime(ex.timestamp)}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}

// ---------- Main Page ----------

export default function TeamPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/team/status')
      .then((r) => r.json())
      .then((d: { agents: AgentStatus[] }) => setAgents(d.agents ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byId = (id: string) => agents.find((a) => a.id === id);

  return (
    <div className="space-y-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
        <h1 className="text-4xl font-bold text-white">The Team</h1>
        <p className="mt-2 text-xl text-zinc-400">Org structure &amp; agent health</p>
      </motion.div>

      {/* Org Chart */}
      <section>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-6"
        >
          Org Chart
        </motion.h2>

        <div className="flex flex-col items-center gap-0">
          {/* CEO */}
          <OrgNode
            name="Cheryl Tibbs"
            role="CEO"
            model="Founder \u00b7 CCC \u00b7 AI Marvels \u00b7 EmergeStack"
            isCEO
            delay={0}
          />
          {/* connector */}
          <div className="w-px h-6 bg-white/20" />
          {/* Juan COO */}
          <OrgNode name="Juan" role="COO" model="Claude Sonnet 4.6" agent={loading ? undefined : byId('main')} delay={0.1} />
          <div className="w-px h-6 bg-white/20" />

          {/* Three groups */}
          <div className="w-full max-w-3xl">
            {/* horizontal bar */}
            <div className="flex justify-between px-16 mb-0">
              <div className="w-px h-6 bg-white/20 mx-auto" style={{ marginLeft: '16.66%' }} />
              <div className="w-px h-6 bg-white/20 mx-auto" />
              <div className="w-px h-6 bg-white/20 mx-auto" style={{ marginRight: '16.66%' }} />
            </div>
            <div className="relative">
              <div className="absolute top-0 left-1/6 right-1/6 h-px bg-white/20" />
            </div>
            <div className="grid grid-cols-3 gap-6 mt-0">
              {/* System */}
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs text-zinc-600 uppercase tracking-widest">System</p>
                <OrgNode name="Emilio" role="Coder" model="Codex 5.3" agent={loading ? undefined : byId('emilio')} delay={0.2} />
              </div>
              {/* Business */}
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs text-zinc-600 uppercase tracking-widest">Business</p>
                <OrgNode name="Catina" role="PM" model="Qwen 3.5" agent={loading ? undefined : byId('catina')} delay={0.25} />
                <OrgNode name="Miguel" role="Marketing" model="Qwen 3.5" agent={loading ? undefined : byId('miguel')} delay={0.3} />
              </div>
              {/* Content */}
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs text-zinc-600 uppercase tracking-widest">Content</p>
                <OrgNode name="Jules" role="Content" model="Qwen 3.5" agent={loading ? undefined : byId('jules')} delay={0.35} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agent Status Cards */}
      <section>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2"
        >
          <Activity className="h-4 w-4" />
          Agent Status
        </motion.h2>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent, i) => (
              <AgentCard key={agent.id} agent={agent} delay={0.4 + i * 0.08} />
            ))}
          </div>
        )}
      </section>

      {/* Failure Dashboard */}
      <section>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-6"
        >
          Failure Dashboard
        </motion.h2>
        <FailureDashboard />
      </section>
    </div>
  );
}
