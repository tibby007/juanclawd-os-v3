'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Agent {
  id: string;
  name?: string;
  role?: string;
  model?: string;
}

// Active roster — shown regardless of openclaw.json
const ACTIVE_ROSTER = [
  { id: 'cheryl', name: 'Cheryl', role: 'CEO', model: 'Human', badge: 'bg-amber-500/20 text-amber-300', hardcoded: true },
  { id: 'juan', name: 'Juan', role: 'COO / Chief AI Officer', model: 'Claude Sonnet 4.6', badge: 'bg-violet-500/20 text-violet-300' },
  { id: 'emilio', name: 'Emilio', role: 'Coder', model: 'OpenAI Codex 5.3', badge: 'bg-blue-500/20 text-blue-300' },
  { id: 'catina', name: 'Catina', role: 'Project Manager', model: 'Qwen 3.5', badge: 'bg-emerald-500/20 text-emerald-300' },
  { id: 'miguel', name: 'Miguel', role: 'Marketing', model: 'Qwen 3.5', badge: 'bg-pink-500/20 text-pink-300' },
  { id: 'jules', name: 'Jules', role: 'Content Writer', model: 'Qwen 3.5', badge: 'bg-sky-500/20 text-sky-300' },
];

const REMOVED_IDS = ['prospector', 'enrichment', 'outreach', 'dex', 'closer', 'pm'];

export default function TeamPage() {
  const [configAgents, setConfigAgents] = useState<Agent[]>([]);

  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((data) => setConfigAgents(data.agents || []))
      .catch(() => {});
  }, []);

  // Filter out removed agents from config
  const activeConfigAgents = configAgents.filter(
    (a) => !REMOVED_IDS.includes(a.id?.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">The Team</h1>
        <p className="text-zinc-500 text-sm mt-1">Active agents powering all three businesses</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACTIVE_ROSTER.map((agent, i) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 backdrop-blur-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-white text-lg">{agent.name}</h3>
                <p className="text-zinc-400 text-sm">{agent.role}</p>
              </div>
              {agent.hardcoded && (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                  HUMAN
                </span>
              )}
            </div>
            <span className={`inline-flex text-xs px-2.5 py-1 rounded-lg font-mono ${agent.badge}`}>
              {agent.model}
            </span>
          </motion.div>
        ))}
      </div>

      {activeConfigAgents.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Additional from openclaw.json
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeConfigAgents.map((agent) => (
              <div
                key={agent.id}
                className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5"
              >
                <h3 className="font-semibold text-zinc-300">{agent.name || agent.id}</h3>
                {agent.role && <p className="text-zinc-500 text-sm">{agent.role}</p>}
                {agent.model && (
                  <span className="inline-flex mt-2 text-xs px-2.5 py-1 rounded-lg font-mono bg-zinc-800 text-zinc-400">
                    {agent.model}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
