'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, X, Edit2, Save, ChevronDown, ChevronRight } from 'lucide-react';

// --- Types ---
interface MemoryFile {
  name: string;
  path: string;
  modified: string;
  preview: string;
  content: string;
}

interface MatchLine {
  line: number;
  text: string;
}

interface SearchResult {
  file: string;
  path: string;
  matches: MatchLine[];
}

interface DocFile {
  name: string;
  path: string;
  modified: string;
  size: number;
  preview: string;
}

// --- Helpers ---
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// --- Skeleton ---
function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-zinc-800 animate-pulse" />
      ))}
    </div>
  );
}

// --- Toast ---
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-xl ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      }`}
    >
      {message}
    </motion.div>
  );
}

// --- Memory Tab ---
function MemoryTab() {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/memory')
      .then((r) => r.json() as Promise<{ files: MemoryFile[] }>)
      .then((d) => setFiles(d.files ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const r = await fetch(`/api/search/memory?q=${encodeURIComponent(q)}`);
      const d = await r.json() as { results: SearchResult[] };
      setSearchResults(d.results ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const onQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search memory files..."
          className="w-full rounded-xl border border-white/10 bg-zinc-800/60 pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        />
        {query && (
          <button onClick={() => { setQuery(''); setSearchResults(null); }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-zinc-400 hover:text-white" />
          </button>
        )}
      </div>

      {/* Search results */}
      {searchResults !== null ? (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">{searchResults.length} file{searchResults.length !== 1 ? 's' : ''} matched</p>
          {searching && <div className="h-10 rounded-xl bg-zinc-800 animate-pulse" />}
          {!searching && searchResults.length === 0 && (
            <p className="text-zinc-400 text-sm">No results found.</p>
          )}
          {!searching && searchResults.map((result) => (
            <div key={result.path} className="rounded-xl border border-white/10 bg-zinc-800/40 overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-400 shrink-0" />
                <span className="text-sm font-medium text-white">{result.file}</span>
              </div>
              {result.matches.length > 0 && (
                <div className="border-t border-white/10 px-4 py-2 space-y-1">
                  {result.matches.map((m) => (
                    <div key={m.line} className="flex gap-2 text-xs">
                      <span className="text-zinc-600 w-8 shrink-0">L{m.line}</span>
                      <span className="text-zinc-300 line-clamp-1">
                        {m.text.replace(
                          new RegExp(query, 'gi'),
                          (match) => `【${match}】`
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : loading ? (
        <Skeleton />
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.path} className="rounded-xl border border-white/10 bg-zinc-800/40 overflow-hidden">
              <button
                onClick={() => setExpanded((e) => (e === file.path ? null : file.path))}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
              >
                {expanded === file.path
                  ? <ChevronDown className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                  : <ChevronRight className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-white">{file.name}</span>
                    <span className="text-xs text-zinc-500">{formatDate(file.modified)}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{file.preview}</p>
                </div>
              </button>
              <AnimatePresence>
                {expanded === file.path && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden border-t border-white/10"
                  >
                    <pre className="px-4 py-4 text-xs text-zinc-300 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                      {file.content}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Documents Tab ---
function DocumentsTab() {
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DocFile | null>(null);
  const [content, setContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadDocs = useCallback(() => {
    setLoading(true);
    fetch('/api/documents')
      .then((r) => r.json() as Promise<{ documents: DocFile[] }>)
      .then((d) => setDocs(d.documents ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const openDoc = async (doc: DocFile) => {
    setSelected(doc);
    setEditing(false);
    // Fetch full content
    try {
      const r = await fetch(`/api/documents?path=${encodeURIComponent(doc.path)}`);
      const d = await r.json() as { documents: DocFile[] };
      const found = d.documents.find((f) => f.path === doc.path);
      // For full content, use the memory API for memory files, otherwise use documents
      // Actually, /api/documents doesn't return content - load via documents/save path
      // We'll just read from the list preview and show it. For full content, use a direct load.
      setContent(found?.preview ?? doc.preview);
    } catch {
      setContent(doc.preview);
    }
    // Load full content from a separate fetch
    loadFullContent(doc.path);
  };

  const loadFullContent = async (path: string) => {
    try {
      const r = await fetch(`/api/documents/content?path=${encodeURIComponent(path)}`);
      if (r.ok) {
        const d = await r.json() as { content: string };
        setContent(d.content);
      }
    } catch {
      // use preview
    }
  };

  const startEdit = () => {
    setEditContent(content);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveDoc = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await fetch('/api/documents/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selected.path, content: editContent }),
      });
      const d = await r.json() as { ok?: boolean; error?: string };
      if (d.ok) {
        setContent(editContent);
        setEditing(false);
        setToast({ message: 'Saved successfully', type: 'success' });
        loadDocs();
      } else {
        setToast({ message: d.error ?? 'Save failed', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="flex gap-6 h-full">
      {/* List */}
      <div className="w-80 shrink-0 space-y-2">
        {loading ? (
          <Skeleton />
        ) : docs.length === 0 ? (
          <p className="text-zinc-400 text-sm">No documents found.</p>
        ) : (
          docs.map((doc) => (
            <button
              key={doc.path}
              onClick={() => openDoc(doc)}
              className={`w-full text-left rounded-xl border px-4 py-3 transition-colors hover:bg-white/5 ${
                selected?.path === doc.path
                  ? 'border-violet-500/50 bg-violet-500/10'
                  : 'border-white/10 bg-zinc-800/40'
              }`}
            >
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{formatDate(doc.modified)} · {formatSize(doc.size)}</p>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{doc.preview}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Reading pane */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 h-full flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-semibold text-white">{selected.name}</span>
                <span className="text-xs text-zinc-500">{formatDate(selected.modified)}</span>
              </div>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={saveDoc}
                      disabled={saving}
                      className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {editing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full min-h-[400px] rounded-xl border border-white/10 bg-zinc-800/60 p-4 font-mono text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                />
              ) : (
                <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full rounded-2xl border border-white/10 bg-zinc-900/40">
            <div className="text-center">
              <FileText className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm">Select a document to read</p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </div>
  );
}

// --- Main Page ---
export default function KnowledgePage() {
  const [tab, setTab] = useState<'memory' | 'documents'>('memory');

  return (
    <div className="space-y-8 min-h-screen">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-white">Knowledge</h1>
        <p className="mt-1 text-zinc-400">Memory files · Docs · Institutional knowledge</p>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-zinc-900/60 p-1 w-fit">
        {(['memory', 'documents'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative rounded-lg px-5 py-2 text-sm font-medium transition-colors capitalize ${
              tab === t ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab === t && (
              <motion.div
                layoutId="knowledge-tab"
                className="absolute inset-0 rounded-lg bg-violet-600/30 border border-violet-500/40"
              />
            )}
            <span className="relative">{t === 'memory' ? 'Memory' : 'Documents'}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'memory' ? <MemoryTab /> : <DocumentsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
