'use client';

import { useEffect, useState, useMemo } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  location?: string;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatEventTime(iso: string) {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = d.getDate();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${weekday} ${month} ${day} · ${time}`;
}

function statusBadge(status: string) {
  const base = 'text-xs px-2 py-0.5 rounded-full font-medium';
  if (status === 'active' || status === 'scheduled') {
    return <span className={`${base} bg-violet-500/20 text-violet-300`}>{status}</span>;
  }
  if (status === 'canceled' || status === 'cancelled') {
    return <span className={`${base} bg-red-500/20 text-red-300`}>{status}</span>;
  }
  return <span className={`${base} bg-zinc-700 text-zinc-400`}>{status}</span>;
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`bg-zinc-800 animate-pulse rounded ${className}`} />;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/calendar-events')
      .then((r) => r.json())
      .then((d) => setEvents(d.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Build month grid
  const { days, startOffset } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    // Convert Sun=0 → Mon=0 offset
    const offset = (firstDay + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { days: daysInMonth, startOffset: offset };
  }, [year, month]);

  // Map: "YYYY-MM-DD" -> event count
  const eventDays = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ev of events) {
      const day = ev.start.split('T')[0];
      map[day] = (map[day] || 0) + 1;
    }
    return map;
  }, [events]);

  // Upcoming events: next 14 days
  const upcoming = useMemo(() => {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + 14);
    return events
      .filter((e) => {
        const d = new Date(e.start);
        return d >= now && d <= cutoff;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events, now]);

  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Total cells in grid (padded)
  const totalCells = startOffset + days;
  const gridCells = Math.ceil(totalCells / 7) * 7;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Calendar</h1>
        <p className="text-zinc-500 text-sm mt-1">Your schedule across all businesses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month Grid */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">{monthName}</h2>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-xs text-zinc-500 font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: gridCells }).map((_, i) => {
                const dayNum = i - startOffset + 1;
                if (dayNum < 1 || dayNum > days) {
                  return <div key={i} className="h-10" />;
                }
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const hasEvent = !!eventDays[dateStr];
                const isToday =
                  dayNum === now.getDate() && month === now.getMonth() && year === now.getFullYear();

                return (
                  <div
                    key={i}
                    className={`h-10 flex flex-col items-center justify-center rounded-lg text-sm transition-colors
                      ${isToday ? 'bg-violet-600/30 text-violet-300 font-bold' : 'text-zinc-300 hover:bg-zinc-800'}
                    `}
                  >
                    <span>{dayNum}</span>
                    {hasEvent && (
                      <span className="w-1 h-1 rounded-full bg-violet-400 mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col">
          <h2 className="text-white font-semibold mb-4">Upcoming (14 days)</h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <SkeletonBlock className="h-4 w-3/4" />
                  <SkeletonBlock className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-zinc-500 text-sm text-center">No upcoming Calendly events</p>
            </div>
          ) : (
            <ul className="space-y-3 overflow-y-auto">
              {upcoming.map((ev) => (
                <li key={ev.id} className="border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white text-sm font-medium leading-snug">{ev.title}</p>
                    {statusBadge(ev.status)}
                  </div>
                  <p className="text-zinc-400 text-xs mt-1">{formatEventTime(ev.start)}</p>
                  {ev.location && (
                    <p className="text-zinc-500 text-xs mt-0.5 truncate">{ev.location}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
