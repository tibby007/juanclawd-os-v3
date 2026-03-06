'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, X, Trash2, GripVertical } from 'lucide-react';

// --- Types ---
interface ContentItem {
  id: string;
  title: string;
  body: string;
  type: string;
  platform: string;
  business: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  notes: string;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
}

type Status = 'draft' | 'review' | 'approved' | 'published';

// --- Helpers ---
const STATUS_LABELS: Record<Status, string> = {
  draft: 'Draft',
  review: 'Review',
  approved: 'Approved',
  published: 'Published',
};

const STATUS_COLORS: Record<Status, string> = {
  draft: 'bg-zinc-600/30 text-zinc-300 border-zinc-500/30',
  review: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  approved: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  published: 'bg-green-500/20 text-green-300 border-green-500/30',
};

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: 'bg-blue-600/20 text-blue-400',
  x: 'bg-zinc-600/20 text-zinc-300',
  instagram: 'bg-pink-600/20 text-pink-400',
};

const BUSINESS_COLORS: Record<string, string> = {
  ccc: 'bg-amber-600/20 text-amber-400',
  ai_marvels: 'bg-violet-600/20 text-violet-400',
  emergestack: 'bg-emerald-600/20 text-emerald-400',
};

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}h ago`;
  return 'just now';
}

// --- Skeleton ---
function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-xl bg-zinc-800 animate-pulse" />
      ))}
    </div>
  );
}

// --- New Content Modal ---
interface NewContentModalProps {
  onClose: () => void;
  onCreated: (item: ContentItem) => void;
}

function NewContentModal({ onClose, onCreated }: NewContentModalProps) {
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'social_post',
    platform: 'linkedin',
    business: 'ai_marvels',
    status: 'draft' as Status,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const r = await fetch('/api/content/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const item = await r.json() as ContentItem;
      onCreated(item);
      onClose();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, content: React.ReactNode) => (
    <div>
      <label className="block text-xs text-zinc-400 mb-1.5">{label}</label>
      {content}
    </div>
  );

  const inputClass = 'w-full rounded-lg border border-white/10 bg-zinc-800/60 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50';
  const selectClass = `${inputClass} appearance-none`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">New Content</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {field('Title', (
            <input
              autoFocus
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Post title..."
              className={inputClass}
            />
          ))}

          <div className="grid grid-cols-3 gap-3">
            {field('Platform', (
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className={selectClass}>
                <option value="linkedin">LinkedIn</option>
                <option value="x">X</option>
                <option value="instagram">Instagram</option>
              </select>
            ))}
            {field('Business', (
              <select value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} className={selectClass}>
                <option value="ai_marvels">AI Marvels</option>
                <option value="ccc">CCC</option>
                <option value="emergestack">EmergeStack</option>
              </select>
            ))}
            {field('Type', (
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={selectClass}>
                <option value="social_post">Social Post</option>
                <option value="caio_content">CAIO Content</option>
              </select>
            ))}
          </div>

          {field('Body', (
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Write the post content..."
              rows={4}
              className={`${inputClass} resize-none`}
            />
          ))}

          {field('Notes', (
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Internal notes..."
              className={inputClass}
            />
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !form.title.trim()}
            className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Kanban Card ---
interface CardProps {
  item: ContentItem;
  onDelete: (id: string) => void;
}

function SortableCard({ item, onDelete }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-white/10 bg-zinc-800/60 p-3 group">
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white leading-snug">{item.title}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${PLATFORM_COLORS[item.platform] ?? 'bg-zinc-700 text-zinc-300'}`}>
              {item.platform}
            </span>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${BUSINESS_COLORS[item.business] ?? 'bg-zinc-700 text-zinc-300'}`}>
              {item.business.replace('_', ' ')}
            </span>
          </div>
          {item.notes && (
            <p className="text-xs text-zinc-500 mt-1.5 line-clamp-1">{item.notes}</p>
          )}
          <p className="text-[10px] text-zinc-600 mt-1.5">{timeAgo(item.updatedAt)}</p>
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// --- Kanban Column ---
interface ColumnProps {
  status: Status;
  items: ContentItem[];
  onDelete: (id: string) => void;
}

function KanbanColumn({ status, items, onDelete }: ColumnProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-zinc-900/60 min-h-[400px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${STATUS_COLORS[status]}`}>
          {STATUS_LABELS[status]}
        </span>
        <span className="text-xs text-zinc-500">{items.length}</span>
      </div>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 p-3">
          {items.map((item) => (
            <SortableCard key={item.id} item={item} onDelete={onDelete} />
          ))}
          {items.length === 0 && (
            <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-white/10">
              <p className="text-xs text-zinc-600">No items</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// --- Pipeline Tab ---
interface PipelineTabProps {
  items: ContentItem[];
  setItems: React.Dispatch<React.SetStateAction<ContentItem[]>>;
  onDelete: (id: string) => void;
  onNewItem: () => void;
}

function PipelineTab({ items, setItems, onDelete, onNewItem }: PipelineTabProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const columns: Status[] = ['draft', 'review', 'approved', 'published'];
  const byStatus = (s: Status) => items.filter((i) => i.status === s);

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;

    // Find what column the over target is in
    const draggedItem = items.find((i) => i.id === draggedId);
    const overItem = items.find((i) => i.id === overId);

    if (!draggedItem) return;

    // If dropping on a column header (status), move there
    let newStatus: Status | null = null;
    if (columns.includes(overId as Status)) {
      newStatus = overId as Status;
    } else if (overItem && overItem.status !== draggedItem.status) {
      newStatus = overItem.status;
    }

    if (newStatus && newStatus !== draggedItem.status) {
      setItems((prev) =>
        prev.map((i) => (i.id === draggedId ? { ...i, status: newStatus! } : i))
      );
      await fetch('/api/content/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draggedId, fields: { status: newStatus } }),
      }).catch(() => {});
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={onNewItem}
          className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Content
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              items={byStatus(status)}
              onDelete={onDelete}
            />
          ))}
        </div>

        <DragOverlay>
          {activeItem && (
            <div className="rounded-xl border border-violet-500/50 bg-zinc-800 p-3 shadow-2xl opacity-90">
              <p className="text-sm font-medium text-white">{activeItem.title}</p>
              <p className="text-xs text-zinc-400 mt-1">{activeItem.platform} · {activeItem.business}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// --- CAIO Tab ---
interface CAIOTabProps {
  items: ContentItem[];
}

function CAIOTab({ items }: CAIOTabProps) {
  const caioItems = items.filter((i) => i.type === 'caio_content').sort((a, b) => b.updatedAt - a.updatedAt);

  const byStatus = {
    draft: caioItems.filter((i) => i.status === 'draft').length,
    review: caioItems.filter((i) => i.status === 'review').length,
    approved: caioItems.filter((i) => i.status === 'approved').length,
    published: caioItems.filter((i) => i.status === 'published').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-2xl font-bold text-white">{caioItems.length}</p>
          <p className="text-xs text-zinc-400 mt-1">Total</p>
        </div>
        {(Object.entries(byStatus) as [Status, number][]).map(([status, count]) => (
          <div key={status} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold text-white">{count}</p>
            <p className="text-xs text-zinc-400 mt-1">{STATUS_LABELS[status]}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {caioItems.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16">
            <p className="text-zinc-500">No CAIO content yet</p>
          </div>
        ) : (
          caioItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-white/10 bg-zinc-800/40 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{item.title}</p>
                  {item.body && (
                    <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{item.body}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${PLATFORM_COLORS[item.platform] ?? 'bg-zinc-700 text-zinc-300'}`}>
                    {item.platform}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${STATUS_COLORS[item.status]}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-600 mt-2">{timeAgo(item.updatedAt)}</p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// --- Main Page ---
export default function ContentPage() {
  const [tab, setTab] = useState<'pipeline' | 'caio'>('pipeline');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadItems = useCallback(() => {
    setLoading(true);
    fetch('/api/content')
      .then((r) => r.json() as Promise<{ items: ContentItem[] }>)
      .then((d) => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch('/api/content/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const handleCreated = (item: ContentItem) => {
    setItems((prev) => [...prev, item]);
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-white">Content</h1>
        <p className="mt-1 text-zinc-400">Pipeline · Social posts · CAIO strategy</p>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-zinc-900/60 p-1 w-fit">
        {([['pipeline', 'Content Pipeline'], ['caio', 'Fractional CAIO']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab === t && (
              <motion.div
                layoutId="content-tab"
                className="absolute inset-0 rounded-lg bg-violet-600/30 border border-violet-500/40"
              />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <Skeleton />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {tab === 'pipeline' ? (
              <PipelineTab
                items={items}
                setItems={setItems}
                onDelete={handleDelete}
                onNewItem={() => setShowModal(true)}
              />
            ) : (
              <CAIOTab items={items} />
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {showModal && (
          <NewContentModal
            onClose={() => setShowModal(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
