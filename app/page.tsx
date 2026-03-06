'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  AlertTriangle,
  FileText,
  Activity,
  Clock,
  HardDrive,
  Cpu,
  MemoryStick,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

interface CalendarEvent {
  title: string;
  start: string;
  end: string;
}

interface UrgentItem {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

interface CredentialStatus {
  key: string;
  present: boolean;
}

interface SystemHealth {
  uptime: string;
  disk: string;
  memory: string;
  processes: string;
}

export default function CommandCenter() {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [urgentItems, setUrgentItems] = useState<UrgentItem[]>([]);
  const [morningBrief, setMorningBrief] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [credentials, setCredentials] = useState<CredentialStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch all data in parallel
        const [calendarRes, sessionsRes, cronRes, credsRes, memoryRes, healthRes] = await Promise.all([
          fetch('/api/calendar-events').catch(() => null),
          fetch('/api/sessions/recent'),
          fetch('/api/cron'),
          fetch('/api/credentials'),
          fetch('/api/memory'),
          fetch('/api/system-health'),
        ]);

        // Calendar events
        if (calendarRes?.ok) {
          const data = await calendarRes.json();
          setCalendarEvents(data.events || []);
        }

        // Urgent items from sessions
        const sessionsData = await sessionsRes.json();
        const urgent: UrgentItem[] = [];
        
        // Check for errors in recent session activity
        sessionsData.entries?.forEach((entry: any) => {
          entry.recentLines?.forEach((line: any) => {
            if (line.role === 'assistant' && line.content?.includes('error')) {
              urgent.push({
                type: 'session',
                severity: 'warning',
                message: `Error in ${entry.agentId}: ${line.content.substring(0, 100)}...`,
                timestamp: new Date().toISOString(),
              });
            }
          });
        });

        // Check cron jobs
        const cronData = await cronRes.json();
        cronData.jobs?.forEach((job: any) => {
          if (job.status === 'failed') {
            urgent.push({
              type: 'cron',
              severity: 'critical',
              message: `Cron job failed: ${job.name || job.id}`,
              timestamp: job.lastRun,
            });
          }
        });

        // Check credentials
        const credsData = await credsRes.json();
        setCredentials(credsData.credentials || []);
        
        const missingCreds = credsData.credentials?.filter((c: CredentialStatus) => !c.present) || [];
        if (missingCreds.length > 0) {
          urgent.push({
            type: 'credentials',
            severity: 'warning',
            message: `Missing ${missingCreds.length} credential(s): ${missingCreds.map((c: CredentialStatus) => c.key).join(', ')}`,
            timestamp: new Date().toISOString(),
          });
        }

        setUrgentItems(urgent);

        // Morning brief
        const memoryData = await memoryRes.json();
        const today = new Date().toISOString().split('T')[0];
        const todayFile = memoryData.files?.find((f: any) => f.name.startsWith(today));
        if (todayFile) {
          // Parse markdown for relevant sections
          const content = todayFile.content;
          const sections = content.split('\n## ').slice(1);
          const brief = sections
            .filter((s: string) => 
              s.includes('Weather') || 
              s.includes('Appointments') || 
              s.includes('Tasks') ||
              s.includes('News') ||
              s.includes('YouTube') ||
              s.includes('Surprise')
            )
            .map((s: string) => `## ${s}`)
            .join('\n');
          setMorningBrief(brief || content.substring(0, 500));
        }

        // System health
        const healthData = await healthRes.json();
        setSystemHealth(healthData);

      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white">Command Center</h1>
        <p className="mt-2 text-xl text-zinc-400">Your business operations at a glance</p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
        >
          <div className="mb-4 flex items-center gap-3">
            <CalendarIcon className="h-6 w-6 text-zinc-400" />
            <h2 className="text-xl font-semibold text-white">Today's Calendar</h2>
          </div>
          {calendarEvents.length === 0 ? (
            <p className="text-zinc-500">No events scheduled for today</p>
          ) : (
            <ul className="space-y-3">
              {calendarEvents.map((event, i) => (
                <li key={i} className="rounded-lg bg-white/5 p-3">
                  <p className="font-medium text-white">{event.title}</p>
                  <p className="text-sm text-zinc-400">
                    {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Urgent / Action Required */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
        >
          <div className="mb-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-zinc-400" />
            <h2 className="text-xl font-semibold text-white">Urgent / Action Required</h2>
          </div>
          {urgentItems.length === 0 ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              <p>All systems operational</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {urgentItems.map((item, i) => (
                <li key={i} className="rounded-lg bg-red-500/10 p-3">
                  <div className="flex items-center gap-2">
                    {item.severity === 'critical' ? (
                      <XCircle className="h-5 w-5 text-red-400" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    )}
                    <span className="font-medium text-white">{item.type}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-300">{item.message}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Morning Brief */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:col-span-2 lg:col-span-3"
        >
          <div className="mb-4 flex items-center gap-3">
            <FileText className="h-6 w-6 text-zinc-400" />
            <h2 className="text-xl font-semibold text-white">Morning Brief</h2>
          </div>
          {morningBrief ? (
            <div className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300">
                {morningBrief}
              </pre>
            </div>
          ) : (
            <p className="text-zinc-500">Morning brief pending — scheduled for 5:00 AM</p>
          )}
        </motion.div>

        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:col-span-2 lg:col-span-3"
        >
          <div className="mb-4 flex items-center gap-3">
            <Activity className="h-6 w-6 text-zinc-400" />
            <h2 className="text-xl font-semibold text-white">System Health</h2>
          </div>
          
          {systemHealth && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-zinc-400" />
                  <span className="text-sm text-zinc-400">Uptime</span>
                </div>
                <p className="mt-2 text-lg font-semibold text-white">{systemHealth.uptime}</p>
              </div>

              <div className="rounded-xl bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-zinc-400" />
                  <span className="text-sm text-zinc-400">Disk</span>
                </div>
                <p className="mt-2 text-lg font-semibold text-white">{systemHealth.disk}</p>
              </div>

              <div className="rounded-xl bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-zinc-400" />
                  <span className="text-sm text-zinc-400">Processes</span>
                </div>
                <p className="mt-2 text-xs font-mono text-zinc-300">
                  {systemHealth.processes.split('\n').slice(0, 3).join('\n')}
                </p>
              </div>

              <div className="rounded-xl bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  <MemoryStick className="h-5 w-5 text-zinc-400" />
                  <span className="text-sm text-zinc-400">Memory</span>
                </div>
                <p className="mt-2 text-xs font-mono text-zinc-300">
                  {systemHealth.memory.split('\n').slice(0, 5).join('\n')}
                </p>
              </div>
            </div>
          )}

          {/* Credentials Status */}
          <div className="mt-6">
            <h3 className="mb-3 text-lg font-semibold text-white">Credential Health</h3>
            <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
              {credentials.map((cred) => (
                <div
                  key={cred.key}
                  className={`flex items-center gap-2 rounded-lg p-2 text-sm ${
                    cred.present ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {cred.present ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span className="truncate">{cred.key.replace('_API_KEY', '').replace('_TOKEN', '').replace('_SERVICE_KEY', '')}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
