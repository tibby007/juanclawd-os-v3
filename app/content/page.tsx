'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Layout,
  Plus,
  Trash2,
  X,
  Layers,
  TrendingUp,
} from 'lucide-react';

// ---------- Types ----------

type ContentStatus = 'draft' | 'review' | 'approved' | 'published';
type Platform = 'x' | 'linkedin' | 'instagram';
type Business = 'ccc' | 'ai_marvels' | 'emergestack';
type ContentType = 'social_post' | 'caio_content';

interface ContentItem {
  id: string;
  title: string;
  body: string;
  type: ContentType;
  platform: Platform;
  business: Business;
  status: ContentStatus;
  notes: string;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
}

interface PipelineData {
  items: ContentItem[];
  grouped?: Record<ContentStatus, ContentItem[]>;
}

// ---------- Styles ----------

const STATUS_COLORS: Record<ContentStatus, { col: string; badge: string; border: string }> = {
  draft:     { col: 'text-zinc-400',   badge: 'bg-zinc-700/50 text-zinc-300',          border: 'border-zinc-700' },
  review:    { col: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400',      border: 'border-yellow-500/30' },
  approved:  { col: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-400',      border: 'border-violet-500/30' },
  published: { col: 'text-green-400',  badge: 'bg-green-500/20 text-green-400',        border: 'border-green-500/30' },
};

const PLATFORM_BADGES: Record<string, string> = {
  x:         'bg-zinc-800 text-zinc-200',
  linkedin:  'bg-blue-900/40 text-blue-300',
  instagram: 'bg-pink-900/40 text-pink-300',
};

const BUSINESS_BADGES: Record<string, string> = {
  ccc:        'bg-amber-900/30 text-amber-300',
  ai_marvels: 'bg-violet-900/30 text-violet-300',
  emergestack: 'bg-cyan-900/30 text-cyan-300',
};

const COLUMN_ORDER: ContentStatus[] = ['draft', 'review', 'approved', 'published'];

// ---------- Card Component ----------

interface CardProps {
  item: ContentItem;
  onDelete: (id: string) => void;
  overlay?: boolean;
}

function KanbanCard({ item, onDelete, overlay = false }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { status: item.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-xl border border-white/10 bg-zinc-900 p-3 cursor-grab active:cursor-grabbing ${
        overlay ? 'shadow-2xl ring-1 ring-violet-500/50' : 'hover:border-white/20'
      }`}
    >
      <p className="text-sm font-semibold text-white leading-tight mb-2">{item.title}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${PLATFORM_BADGES[item.platform] ?? 'bg-zinc-700 text-zinc-300'}`}>
          {item.platform}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${BUSINESS_BADGES[item.business] ?? 'bg-zinc-700 text-zinc-300'}`}>
          {item.business}
        </span>
      </div>
      {item.notes && (
        <p className="text-xs text-zinc-500 line-clamp-2">{item.notes}</p>
      )}
      <div className="flex justify-end mt-2">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="text-zinc-600 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------- Column ----------

interface ColumnProps {
  status: ContentStatus;
  items: ContentItem[];
  onDelete: (id: string) => void;
}

function KanbanColumn({ status, items, onDelete }: ColumnProps) {
  const { badge, border } = STATUS_COLORS[status];
  return (
    <div className={`flex flex-col rounded-2xl border bg-zinc-900/50 p-3 min-h-[300px] ${border} bg-opacity-30`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white capitalize">{status}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge}`}>
          {items.length}
        </span>
      </div>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {items.map((item) => (
            <KanbanCard key={item.id} item={item} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ---------- New Content Modal ----------

interface NewContentModalProps {
  onClose: () => void;
  onCreated: (item: ContentItem) => void;
}

function NewContentModal({ onClose, onCreated }: NewContentModalProps) {
  const [form, setForm] = useState({
    title: '',
    body: '',
    platform: 'linkedin' as Platform,
    business: 'ai_marvels' as Business,
    type: 'social_post' as ContentType,
    notes: '',
    status: 'draft' as ContentStatus,
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return; }
    setSubmitting(true);
    try {
      const r = await fetch('/api/content/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const item = await r.json() as ContentItem;
      if ('error' in item) { setErr((item as { error: string }).error); return; }
      onCreated(item);
      onClose();
    } catch { setErr('Failed to create'); }
    finally { setSubmitting(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">New Content</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            placeholder="Title *"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-violet-500/50 focus:outline-none"
          />

          <div className="grid grid-cols-3 gap-2">
            <select value={form.platform} onChange={(e) => set('platform', e.target.value)}
              className="rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:outline-none">
              <option value="linkedin">LinkedIn</option>
              <option value="x">X</option>
              <option value="instagram">Instagram</option>
            </select>
            <select value={form.business} onChange={(e) => set('business', e.target.value)}
              className="rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:outline-none">
              <option value="ai_marvels">AI Marvels</option>
              <option value="ccc">CCC</option>
              <option value="emergestack">EmergeStack</option>
            </select>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}
              className="rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:outline-none">
              <option value="social_post">Social Post</option>
              <option value="caio_content">CAIO Content</option>
            </select>
          </div>

          <textarea
            placeholder="Body"
            value={form.body}
            onChange={(e) => set('body', e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-violet-500/50 focus:outline-none resize-none"
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-violet-500/50 focus:outline-none resize-none"
          />

          {err && <p className="text-xs text-red-400">{err}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-violet-600 text-sm text-white font-medium hover:bg-violet-500 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------- Content Pipeline Tab ----------

function PipelineTab() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeItem, setActiveItem] = useState<ContentItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    fetch('/api/content')
      .then((r) => r.json())
      .then((d: PipelineData) => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byStatus = (s: ContentStatus) => items.filter((i) => i.status === s);

  const handleDragStart = (event: DragStartEvent) => {
    const item = items.find((i) => i.id === event.active.id);
    setActiveItem(item ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    // Determine target status from over container
    const overData = over.data?.current as { status?: ContentStatus } | undefined;
    const targetStatus: ContentStatus =
      (overData?.status as ContentStatus) ??
      (COLUMN_ORDER.includes(over.id as ContentStatus) ? (over.id as ContentStatus) : null) ??
      (items.find((i) => i.id === over.id)?.status ?? 'draft');

    const draggedItem = items.find((i) => i.id === active.id);
    if (!draggedItem || draggedItem.status === targetStatus) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === draggedItem.id ? { ...i, status: targetStatus } : i))
    );

    try {
      await fetch('/api/content/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draggedItem.id, fields: { status: targetStatus } }),
      });
    } catch {
      // revert
      setItems((prev) =>
        prev.map((i) => (i.id === draggedItem.id ? { ...i, status: draggedItem.status } : i))
      );
    }
  };

  const handleDelete = async (id: string) => {
    const prev = items;
    setItems((p) => p.filter((i) => i.id !== id));
    try {
      await fetch('/api/content/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      setItems(prev);
    }
  };

  const handleCreated = (item: ContentItem) => {
    setItems((prev) => [item, ...prev]);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {COLUMN_ORDER.map((s) => (
          <div key={s} className="h-64 rounded-2xl bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Content
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-4">
          {COLUMN_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              items={byStatus(status)}
              onDelete={handleDelete}
            />
          ))}
        </div>

        <DragOverlay>
          {activeItem && (
            <KanbanCard item={activeItem} onDelete={() => {}} overlay />
          )}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {showModal && (
          <NewContentModal
            onClose={() => setShowModal(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ---------- Fractional CAIO Tab ----------

function CAIOTab() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/content')
      .then((r) => r.json())
      .then((d: PipelineData) => {
        const caio = (d.items ?? []).filter((i) => i.type === 'caio_content');
        caio.sort((a, b) => b.updatedAt - a.updatedAt);
        setItems(caio);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusCounts = COLUMN_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: items.filter((i) => i.status === s).length }),
    {} as Record<ContentStatus, number>
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-zinc-800 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-xs text-zinc-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-white">{items.length}</p>
        </div>
        {COLUMN_ORDER.map((s) => (
          <div key={s} className={`rounded-xl border p-4 text-center ${STATUS_COLORS[s].border} bg-white/3`}>
            <p className="text-xs text-zinc-500 mb-1 capitalize">{s}</p>
            <p className={`text-2xl font-bold ${STATUS_COLORS[s].col}`}>{statusCounts[s]}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-white/10 text-zinc-500">
          <p className="text-sm">No CAIO content yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-sm font-semibold text-white leading-tight">{item.title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PLATFORM_BADGES[item.platform] ?? 'bg-zinc-700 text-zinc-300'}`}>
                    {item.platform}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[item.status].badge} ${STATUS_COLORS[item.status].border}`}>
                    {item.status}
                  </span>
                </div>
              </div>
              {item.body && (
                <p className="text-xs text-zinc-400 line-clamp-2 mb-1">{item.body}</p>
              )}
              <p className="text-xs text-zinc-600">
                Updated {new Date(item.updatedAt).toLocaleDateString()}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Main Page ----------

type TabId = 'pipeline' | 'caio';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'pipeline', label: 'Content Pipeline', icon: Layout },
  { id: 'caio',     label: 'Fractional CAIO',  icon: TrendingUp },
];

export default function ContentPage() {
  const [tab, setTab] = useState<TabId>('pipeline');

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-white">Content</h1>
        <p className="mt-2 text-xl text-zinc-400">Social posts, blogs, and marketing materials</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === id ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'pipeline' && <PipelineTab />}
          {tab === 'caio' && <CAIOTab />}
        </motion.div>
      </AnimatePresence>

      {/* Legend */}
      {tab === 'pipeline' && (
        <div className="flex items-center gap-2 flex-wrap">
          <Layers className="h-3 w-3 text-zinc-600" />
          <span className="text-xs text-zinc-600">Drag cards between columns to update status</span>
        </div>
      )}
    </div>
  );
}
