'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AnalyticsData {
  sessions: {
    count: number;
    totalMessages: number;
    totalToolCalls: number;
    totalTokens: number;
    totalCost: number;
  };
  revenue: {
    month: string | null;
    ccc: { pipeline_value?: number; deals_closed?: number; commission_earned?: number };
    ai_marvels: { pipeline_value?: number; deals_closed?: number; commission_earned?: number };
    emergestack: { pipeline_value?: number; deals_closed?: number; commission_earned?: number };
  };
  content: {
    month: string | null;
    total: number;
    items: Array<{ title?: string; status?: string; platform?: string }>;
  };
  crons: { total: number; active: number };
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
      {sub && <p className="text-zinc-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 h-24 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 h-48 animate-pulse" />
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 h-48 animate-pulse" />
      </div>
    </div>
  );
}

const VIOLET = '#8b5cf6';

function fmt$(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load analytics'));
  }, []);

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>
      <Skeleton />
    </div>
  );

  const { sessions, revenue, content, crons } = data;

  // Revenue bar chart data
  const revenueChartData = [
    { name: 'CCC', value: revenue.ccc?.pipeline_value ?? 0 },
    { name: 'AI Marvels', value: revenue.ai_marvels?.pipeline_value ?? 0 },
    { name: 'EmergeStack', value: revenue.emergestack?.pipeline_value ?? 0 },
  ];

  // Agent activity bar chart
  const agentChartData = [
    { name: 'Sessions', value: sessions.count },
    { name: 'Messages', value: sessions.totalMessages },
    { name: 'Tool Calls', value: sessions.totalToolCalls },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-zinc-500 text-sm mt-1">Business performance &amp; agent productivity — local files only</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Sessions" value={sessions.count} sub="JSONL files" />
        <StatCard label="Total Tokens" value={sessions.totalTokens.toLocaleString()} sub="across all sessions" />
        <StatCard label="Session Cost" value={fmt$(sessions.totalCost)} sub="estimated" />
        <StatCard label="Crons Active" value={`${crons.active} / ${crons.total}`} sub="openclaw cron list" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agent activity */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
          <p className="text-white font-semibold mb-4">Agent Activity</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={agentChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: VIOLET }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {agentChartData.map((_, i) => <Cell key={i} fill={VIOLET} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue pipeline */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
          <p className="text-white font-semibold mb-1">Revenue Pipeline</p>
          <p className="text-zinc-500 text-xs mb-4">{revenue.month ?? 'Current month'} · edit analytics/revenue.json to update</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revenueChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: VIOLET }}
                formatter={(v: number | undefined) => fmt$(v ?? 0)}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {revenueChartData.map((_, i) => <Cell key={i} fill={VIOLET} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Content pipeline */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
        <p className="text-white font-semibold mb-1">Content Pipeline</p>
        <p className="text-zinc-500 text-xs mb-4">{content.month ?? 'Current month'} · {content.total} items · edit content/pipeline.json to update</p>
        {content.total === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-4">No content items yet. Add to ~/.openclaw/workspace/content/pipeline.json</p>
        ) : (
          <div className="space-y-2">
            {content.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                <span className="text-zinc-300 text-sm">{item.title ?? 'Untitled'}</span>
                <div className="flex gap-2">
                  {item.platform && <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{item.platform}</span>}
                  {item.status && <span className="text-xs text-violet-400 bg-violet-900/30 px-2 py-0.5 rounded-full">{item.status}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
