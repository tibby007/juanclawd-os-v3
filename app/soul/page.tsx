'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Eye, EyeOff, RotateCcw, Check, AlertTriangle, Plus, Trash2, Edit2 } from 'lucide-react';

interface SoulFile {
  name: string;
  content: string;
  lastModified: string;
  size: number;
}

interface AgentConfig {
  name: string;
  model: string;
  sessionKey?: string;
  business?: string;
  level?: string;
  toolPolicies?: {
    allow?: string[];
    deny?: string[];
    elevated?: string[];
  };
  enabled?: boolean;
}

const WORKSPACE_FILES = [
  'SOUL.md',
  'RULES.md',
  'GOALS.md',
  'AGENTS.md',
  'TOOLS.md',
  'MEMORY.md',
  'WORKING.md',
];

const TABS = [
  { id: 'soul', label: 'Soul Files', icon: '📄' },
  { id: 'agents', label: 'Agent Config', icon: '🤖' },
  { id: 'agent-files', label: 'Per-Agent Files', icon: '📁' },
  { id: 'raw', label: 'Raw Config', icon: '🔧' },
];

export default function SoulEditorPage() {
  const [activeTab, setActiveTab] = useState('soul');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Soul Files state
  const [soulFiles, setSoulFiles] = useState<SoulFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Agent Config state
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState<Partial<AgentConfig>>({});

  // Per-Agent Files state
  const [selectedAgentId, setSelectedAgentId] = useState('main');
  const [agentFiles, setAgentFiles] = useState<SoulFile[]>([]);
  const [selectedAgentFile, setSelectedAgentFile] = useState<string | null>(null);
  const [agentFileContent, setAgentFileContent] = useState('');

  // Raw Config state
  const [rawConfig, setRawConfig] = useState('');
  const [rawConfigError, setRawConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'soul') loadSoulFiles();
    else if (activeTab === 'agents') loadAgentConfig();
    else if (activeTab === 'agent-files') loadAgentFiles(selectedAgentId);
    else if (activeTab === 'raw') loadRawConfig();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'agent-files') loadAgentFiles(selectedAgentId);
  }, [selectedAgentId, activeTab]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const loadSoulFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/soul/files');
      const data = await res.json();
      if (data.files) setSoulFiles(data.files);
    } catch (err) {
      showToast('Failed to load soul files', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectFile = (filename: string) => {
    if (hasUnsavedChanges && !confirm('You have unsaved changes. Discard them?')) return;
    const file = soulFiles.find((f) => f.name === filename);
    if (file) {
      setSelectedFile(filename);
      setFileContent(file.content);
      setOriginalContent(file.content);
      setHasUnsavedChanges(false);
      setPreviewMode(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    setFileContent(newContent);
    setHasUnsavedChanges(newContent !== originalContent);
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      const res = await fetch('/api/soul/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedFile, content: fileContent }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setOriginalContent(fileContent);
        setHasUnsavedChanges(false);
        loadSoulFiles();
      } else {
        showToast(data.error || 'Failed to save', 'error');
      }
    } catch (err) {
      showToast('Failed to save file', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = fileContent.substring(0, start) + '  ' + fileContent.substring(end);
      setFileContent(newValue);
      setHasUnsavedChanges(newValue !== originalContent);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const loadAgentConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
      setModels(data.models || []);
    } catch (err) {
      showToast('Failed to load agent config', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startEditAgent = (agent: AgentConfig) => {
    setEditingAgent(agent.name);
    setAgentForm({ ...agent });
  };

  const startAddAgent = () => {
    setEditingAgent('__new__');
    setAgentForm({
      name: '',
      model: models[0]?.id || 'openai-codex/gpt-5.4-codex',
      business: 'system',
      level: 'specialist',
      toolPolicies: { allow: [], deny: [], elevated: [] },
      enabled: true,
    });
  };

  const saveAgent = async () => {
    setLoading(true);
    try {
      const isUpdate = editingAgent !== '__new__';
      const agentId = isUpdate ? editingAgent : agentForm.name;
      if (!agentId) {
        showToast('Agent name is required', 'error');
        return;
      }
      const res = await fetch('/api/config/agents/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isUpdate ? 'update' : 'add',
          agentId,
          agentData: agentForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setEditingAgent(null);
        loadAgentConfig();
      } else {
        showToast(data.error || 'Failed to save agent', 'error');
      }
    } catch (err) {
      showToast('Failed to save agent', 'error');
    } finally {
      setLoading(false);
    }
  };

  const removeAgent = async (agentName: string) => {
    if (!confirm(`Remove ${agentName}? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/config/agents/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', agentId: agentName }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        loadAgentConfig();
      } else {
        showToast(data.error || 'Failed to remove', 'error');
      }
    } catch (err) {
      showToast('Failed to remove agent', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAgentFiles = async (agentId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/soul/agent-files?agentId=${agentId}`);
      const data = await res.json();
      setAgentFiles(data.files || []);
    } catch (err) {
      showToast('Failed to load agent files', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveAgentFile = async () => {
    if (!selectedAgentFile || !selectedAgentId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/soul/agent-file/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
          filename: selectedAgentFile,
          content: agentFileContent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        loadAgentFiles(selectedAgentId);
      } else {
        showToast(data.error || 'Failed to save', 'error');
      }
    } catch (err) {
      showToast('Failed to save agent file', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRawConfig = async () => {
    setLoading(true);
    setRawConfigError(null);
    try {
      const res = await fetch('/api/config/raw');
      const data = await res.json();
      setRawConfig(data.content || '');
    } catch (err) {
      showToast('Failed to load configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateJson = () => {
    try {
      JSON.parse(rawConfig);
      setRawConfigError(null);
      showToast('JSON is valid');
      return true;
    } catch (err: any) {
      setRawConfigError(err.message);
      showToast('Invalid JSON: ' + err.message, 'error');
      return false;
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(rawConfig);
      setRawConfig(JSON.stringify(parsed, null, 2));
      setRawConfigError(null);
      showToast('JSON formatted');
    } catch (err) {
      showToast('Cannot format invalid JSON', 'error');
    }
  };

  const saveRawConfig = async () => {
    if (!validateJson()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/config/raw/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: rawConfig }),
      });
      const data = await res.json();
      if (data.success) showToast(data.message);
      else showToast(data.error || 'Failed to save', 'error');
    } catch (err) {
      showToast('Failed to save configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const revertConfig = async () => {
    if (!confirm('Revert to backup? This will discard all unsaved changes.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/config/raw/save', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revert' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        loadRawConfig();
      } else {
        showToast(data.error || 'Failed to revert', 'error');
      }
    } catch (err) {
      showToast('Failed to revert configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white">⚙️ Soul Editor</h1>
          <p className="mt-2 text-xl text-zinc-400">Agent configuration & soul files</p>
        </motion.div>

        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-800">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t-lg transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Soul Files */}
        {activeTab === 'soul' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 h-[600px] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4 text-white">Workspace Files</h2>
              <ul className="space-y-2">
                {WORKSPACE_FILES.map((filename) => {
                  const file = soulFiles.find((f) => f.name === filename);
                  const isSelected = selectedFile === filename;
                  const hasChanges = selectedFile === filename && hasUnsavedChanges;
                  return (
                    <li key={filename}>
                      <button
                        onClick={() => selectFile(filename)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        <span>{filename}</span>
                        {hasChanges && <span className="w-2 h-2 bg-yellow-400 rounded-full" />}
                      </button>
                      {file && (
                        <div className="text-xs text-zinc-500 ml-3 mt-1">
                          {new Date(file.lastModified).toLocaleString()} • {(file.size / 1024).toFixed(1)} KB
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="col-span-9 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 h-[600px] flex flex-col">
              {selectedFile ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">{selectedFile}</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPreviewMode(!previewMode)}
                        className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
                      >
                        {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={handleSaveFile}
                        disabled={loading || !hasUnsavedChanges}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                          hasUnsavedChanges
                            ? 'bg-green-600 hover:bg-green-500 text-white'
                            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        <Save className="w-4 h-4" />
                        {loading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>

                  {previewMode ? (
                    <div className="flex-1 overflow-y-auto bg-zinc-950 rounded-lg p-4 prose prose-invert max-w-none text-zinc-300 whitespace-pre-wrap">
                      {fileContent}
                    </div>
                  ) : (
                    <textarea
                      value={fileContent}
                      onChange={(e) => handleContentChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1 bg-zinc-950 text-zinc-100 font-mono text-sm p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      spellCheck={false}
                    />
                  )}

                  <div className="mt-4 text-sm text-zinc-500 flex justify-between">
                    <span>Lines: {fileContent.split('\n').length} | Characters: {fileContent.length}</span>
                    {hasUnsavedChanges && (
                      <span className="text-yellow-400 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Unsaved changes
                      </span>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-zinc-600">
                    💡 Tip: Send <code className="bg-zinc-800 px-1 rounded">/new</code> to Juan on Telegram to reload these changes
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-500">
                  Select a file to edit
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Agent Config */}
        {activeTab === 'agents' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Agent Configurations</h2>
              <button
                onClick={startAddAgent}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Agent
              </button>
            </div>

            {editingAgent ? (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 max-w-2xl">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {editingAgent === '__new__' ? 'Add New Agent' : `Edit: ${editingAgent}`}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-zinc-400">Name</label>
                    <input
                      type="text"
                      value={agentForm.name || ''}
                      onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Agent name"
                      disabled={editingAgent !== '__new__'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-zinc-400">Model</label>
                    <select
                      value={agentForm.model || ''}
                      onChange={(e) => setAgentForm({ ...agentForm, model: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {models.map((m: any) => (
                        <option key={m.id || m} value={m.id || m}>
                          {m.name || m.id || m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-zinc-400">Business</label>
                      <select
                        value={agentForm.business || 'system'}
                        onChange={(e) => setAgentForm({ ...agentForm, business: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="system">System</option>
                        <option value="ccc">CCC</option>
                        <option value="ai_marvels">AI Marvels</option>
                        <option value="emergestack">EmergeStack</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-zinc-400">Level</label>
                      <select
                        value={agentForm.level || 'specialist'}
                        onChange={(e) => setAgentForm({ ...agentForm, level: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="lead">Lead</option>
                        <option value="specialist">Specialist</option>
                        <option value="intern">Intern</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enabled"
                      checked={agentForm.enabled !== false}
                      onChange={(e) => setAgentForm({ ...agentForm, enabled: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="enabled" className="text-sm font-medium">Enabled</label>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={saveAgent}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium"
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingAgent(null)}
                      className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                  <div key={agent.name} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-white">{agent.name}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          agent.enabled !== false
                            ? 'bg-green-600/20 text-green-400'
                            : 'bg-zinc-600/20 text-zinc-400'
                        }`}
                      >
                        {agent.enabled !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-400 space-y-1 mb-4">
                      <p>Model: {agent.model}</p>
                      {agent.business && <p>Business: {agent.business}</p>}
                      {agent.level && <p>Level: {agent.level}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditAgent(agent)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => removeAgent(agent.name)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
                {agents.length === 0 && (
                  <div className="col-span-full text-center text-zinc-500 py-8">
                    No agents configured. Click "Add Agent" to create one.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Per-Agent Files */}
        {activeTab === 'agent-files' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
              <label className="block text-sm font-medium mb-2 text-zinc-400">Select Agent</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="main">main</option>
                <option value="ccc-prospect">ccc-prospect</option>
                <option value="ccc-outreach">ccc-outreach</option>
                <option value="ccc-qualifier">ccc-qualifier</option>
              </select>
            </div>
            <div className="col-span-12 bg-yellow-900/20 border border-yellow-700/50 rounded-2xl p-4 text-yellow-400">
              ⚠️ Agent-level files override global config. Edit with caution.
            </div>
            <div className="col-span-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 h-[500px] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4 text-white">Agent Files</h2>
              <ul className="space-y-2">
                {agentFiles.map((file) => (
                  <li key={file.name}>
                    <button
                      onClick={() => {
                        setSelectedAgentFile(file.name);
                        setAgentFileContent(file.content);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition ${
                        selectedAgentFile === file.name
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {file.name}
                    </button>
                    <div className="text-xs text-zinc-500 ml-3 mt-1">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </li>
                ))}
                {agentFiles.length === 0 && (
                  <li className="text-zinc-500 text-sm">No files found for this agent</li>
                )}
              </ul>
            </div>
            <div className="col-span-9 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 h-[500px] flex flex-col">
              {selectedAgentFile ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">
                      {selectedAgentId} / {selectedAgentFile}
                    </h2>
                    <button
                      onClick={saveAgentFile}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium"
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  <textarea
                    value={agentFileContent}
                    onChange={(e) => setAgentFileContent(e.target.value)}
                    className="flex-1 bg-zinc-950 text-zinc-100 font-mono text-sm p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    spellCheck={false}
                  />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-500">
                  Select a file to edit
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Raw Config */}
        {activeTab === 'raw' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Raw openclaw.json</h2>
              <div className="flex gap-2">
                <button
                  onClick={validateJson}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm"
                >
                  Validate
                </button>
                <button
                  onClick={formatJson}
                  className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm"
                >
                  Format
                </button>
                <button
                  onClick={revertConfig}
                  className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm"
                >
                  <RotateCcw className="w-4 h-4 inline mr-1" /> Revert
                </button>
                <button
                  onClick={saveRawConfig}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            {rawConfigError && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 text-red-400 font-mono text-sm">
                {rawConfigError}
              </div>
            )}
            <textarea
              value={rawConfig}
              onChange={(e) => setRawConfig(e.target.value)}
              className="w-full h-[600px] bg-zinc-950 text-zinc-100 font-mono text-sm p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
