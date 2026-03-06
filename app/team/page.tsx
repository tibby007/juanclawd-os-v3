'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Crown, Briefcase, Code, Megaphone, PenTool, Settings } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  status: 'active' | 'inactive';
  lastActive?: string;
}

const AGENT_ROLES: Record<string, { icon: any; color: string }> = {
  'COO': { icon: Briefcase, color: 'text-blue-400' },
  'Coder': { icon: Code, color: 'text-green-400' },
  'PM': { icon: Settings, color: 'text-purple-400' },
  'Marketing': { icon: Megaphone, color: 'text-orange-400' },
  'Writer': { icon: PenTool, color: 'text-pink-400' },
};

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch('/api/agents');
        const data = await response.json();
        
        // Map agents with enhanced info
        const agentList = (data.agents || []).map((agent: any) => ({
          id: agent.id || agent.name,
          name: agent.name,
          role: agent.role || 'Agent',
          model: agent.model || 'Unknown',
          status: agent.active ? 'active' : 'inactive',
          lastActive: agent.lastActive,
        }));
        
        setAgents(agentList);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAgents();
  }, []);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white">The Team</h1>
        <p className="mt-2 text-xl text-zinc-400">Your AI agent workforce</p>
      </motion.div>

      {/* Cheryl - hardcoded CEO */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Cheryl Tibbs</h2>
            <p className="text-lg text-amber-400">CEO / Founder</p>
            <p className="text-sm text-zinc-400">CCC · AI Marvels · EmergeStack</p>
          </div>
        </div>
      </motion.div>

      {/* AI Agents */}
      {loading ? (
        <p className="text-zinc-500">Loading team roster...</p>
      ) : agents.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <p className="text-zinc-400">No agents configured yet. Add agents via Soul Editor.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {agents.map((agent, i) => {
            const RoleIcon = AGENT_ROLES[agent.role]?.icon || Users;
            const color = AGENT_ROLES[agent.role]?.color || 'text-zinc-400';
            
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-white/10 ${color}`}>
                      <RoleIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                      <p className={`text-sm ${color}`}>{agent.role}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      agent.status === 'active'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-zinc-500/10 text-zinc-400'
                    }`}
                  >
                    {agent.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-zinc-500">Model: {agent.model}</p>
                  {agent.lastActive && (
                    <p className="text-xs text-zinc-500">
                      Last active: {new Date(agent.lastActive).toLocaleString()}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
