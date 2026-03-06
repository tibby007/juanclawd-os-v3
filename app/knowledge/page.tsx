'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, BookOpen, Edit3, Save, X, Clock, HardDrive } from 'lucide-react';

// ---------- Types ----------

interface MemoryFile {
  name: string;
  path: string;
  modified: string;
  preview: string;
  content: string;
}

interface MemoryFiles {
  files: MemoryFile[];
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

// ---------- Helpers ----------

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return iso; }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------- Memory Tab ----------

function MemoryTab() {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/memory')
      .then((r) => r.json())
      .then((d: MemoryFiles) => setFiles(d.files ?? []))
      .catch(() => setError('Failed to load memory files'))
      .finally(() => setLoading(false));
  }, []);

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) { setSearchResults(null); return; }
    setSearching(true);
    fetch(`/api/search/memory?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d: { results: SearchResult[] }) => setSearchResults(d.results ?? []))
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, []);

  const handleSearch = (val: string) => {
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
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search memory files..."
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Search results */}
      {searchResults !== null ? (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">{searchResults.length} file(s) matched</p>
          {searchResults.length === 0 ? (
            <p className="text-zinc-500 text-sm">No results for &ldquo;{query}&rdquo;</p>
          ) : (
            searchResults.map((result) => (
              <div key={result.path} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-violet-400" />
                  <p className="text-sm font-semibold text-white">{result.file}</p>
                </div>
                {result.matches.map((m) => (
                  <div key={m.line} className="rounded-lg bg-zinc-900/60 px-3 py-2 mb-1">
                    <span className="text-xs text-zinc-500 mr-2">L{m.line}</span>
                    <span className="text-xs text-zinc-300 font-mono">
                      {m.text.replace(
                        new RegExp(`(${query})`, 'gi'),
                        (match) => `【${match}】`
                      ).split('【').map((part, i) =>
                        i === 0 ? part : (
                          <>
                            <mark key={i} className="bg-violet-500/30 text-violet-300 rounded px-0.5">
                              {part.split('】')[0]}
                            </mark>
                            {part.split('】').slice(1)}
                          </>
                        )
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <motion.div
              key={file.path}
              layout
              className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
            >
              <button
                className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(expanded === file.path ? null : file.path)}
              >
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-1.5 h-8 rounded-full bg-violet-500/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-white truncate">{file.name}</span>
                    <span className="text-xs text-zinc-500 shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(file.modified)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-2">{file.preview}</p>
                </div>
              </button>
              <AnimatePresence>
                {expanded === file.path && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">
                      <div className="rounded-lg bg-zinc-900/80 p-4 max-h-96 overflow-y-auto">
                        <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                          {file.content}
                        </pre>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Documents Tab ----------

function DocumentsTab() {
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<DocFile | null>(null);
  const [docContent, setDocContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/documents')
      .then((r) => r.json())
      .then((d: { documents: DocFile[] }) => setDocs(d.documents ?? []))
      .catch(() => setError('Failed to load documents'))
      .finally(() => setLoading(false));
  }, []);

  // When a doc is selected, load its content from memory data (already fetched) or refetch
  const selectDoc = (doc: DocFile) => {
    setSelected(doc);
    setEditing(false);
    // Fetch content
    fetch('/api/documents')
      .then((r) => r.json())
      .then((d: { documents: Array<DocFile & { content?: string }> }) => {
        const full = d.documents?.find((x) => x.path === doc.path);
        setDocContent(full?.content ?? '');
      })
      .catch(() => setDocContent(''));
  };

  const startEdit = () => {
    setEditValue(docContent);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await fetch('/api/documents/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selected.path, content: editValue }),
      });
      const d = await r.json() as { ok?: boolean; error?: string };
      if (d.ok) {
        setDocContent(editValue);
        setEditing(false);
        setToast({ msg: 'Saved successfully', ok: true });
      } else {
        setToast({ msg: d.error ?? 'Save failed', ok: false });
      }
    } catch {
      setToast({ msg: 'Network error', ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="flex gap-6">
      {/* List */}
      <div className="w-80 shrink-0 space-y-2">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-zinc-800 animate-pulse" />
          ))
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
        ) : (
          docs.map((doc) => (
            <button
              key={doc.path}
              onClick={() => selectDoc(doc)}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                selected?.path === doc.path
                  ? 'border-violet-500/50 bg-violet-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/8'
              }`}
            >
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{doc.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{formatDate(doc.modified)}</p>
                  <p className="text-xs text-zinc-600">{formatSize(doc.size)}</p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2 pl-6">{doc.preview}</p>
            </button>
          ))
        )}
      </div>

      {/* Reading pane */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-semibold text-white">{selected.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {!editing ? (
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-500/20 px-3 py-1.5 text-xs text-violet-400 hover:bg-violet-500/30 transition-colors"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1.5 rounded-lg bg-zinc-700/50 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700 transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-3 w-3" />
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="p-5 max-h-[600px] overflow-y-auto">
              {editing ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full h-96 rounded-lg bg-zinc-900/80 p-4 text-xs text-zinc-300 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-violet-500/30 resize-none"
                />
              ) : (
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {docContent || 'Loading…'}
                </pre>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-dashed border-white/10 text-zinc-500">
            <HardDrive className="h-8 w-8 mb-2" />
            <p className="text-sm">Select a document to read</p>
          </div>
        )}

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`fixed bottom-6 right-6 rounded-xl px-4 py-3 text-sm font-medium shadow-xl ${
                toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------- Main Page ----------

type TabId = 'memory' | 'documents';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'memory',    label: 'Memory',    icon: BookOpen },
  { id: 'documents', label: 'Documents', icon: FileText },
];

export default function KnowledgePage() {
  const [tab, setTab] = useState<TabId>('memory');

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-white">Knowledge</h1>
        <p className="mt-2 text-xl text-zinc-400">Research, docs, and institutional memory</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === id
                ? 'bg-violet-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'memory' && <MemoryTab />}
          {tab === 'documents' && <DocumentsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
