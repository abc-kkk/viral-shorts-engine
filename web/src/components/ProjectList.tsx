'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Film, Clock, Layers, Trash2, FolderOpen, Settings } from 'lucide-react';

interface ProjectInfo {
  projectId: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  currentPhase: number;
  coverUrl: string;
}

const PHASE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: '剧本室', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  2: { label: '定妆室', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  3: { label: '画板区', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  4: { label: '渲染室', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

export default function ProjectList() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) setProjects(data.projects);
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: newName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = `/studio/${encodeURIComponent(data.projectId)}`;
      } else {
        alert('立项失败: ' + data.error);
      }
    } catch (e: any) {
      alert('立项失败: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm(`确定要把「${projectId}」扔进回收站吗？`)) return;
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => prev.filter(p => p.projectId !== projectId));
      } else {
        alert('删除失败: ' + data.error);
      }
    } catch (e: any) {
      alert('删除失败: ' + e.message);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Film className="text-orange-500 w-8 h-8" />
              短剧引擎 <span className="bg-gradient-to-r from-orange-400 to-amber-500 text-transparent bg-clip-text">Comedy Skit Studio</span>
            </h1>
            <p className="text-neutral-500 text-sm mt-1">导演级 AI 短剧制片工作台</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/prompt-studio"
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl transition-all"
            >
              <Layers className="w-5 h-5" /> 提示词中心
            </a>
            {typeof window !== 'undefined' && (window as any).electronAPI && (
              <button
                onClick={() => (window as any).electronAPI.changeWorkspacePath()}
                className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl transition-all"
                title="更改工作空间目录"
              >
                <Settings className="w-5 h-5" /> 更改目录
              </button>
            )}
            <a
              href="/scene-lab"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600/80 to-purple-600/80 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-900/20 hover:scale-105"
            >
              📐 定制化绘图
            </a>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl shadow-lg shadow-orange-900/30 transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5" /> 新建项目
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 gap-6">
            <div className="w-24 h-24 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <FolderOpen className="w-12 h-12 text-neutral-700" />
            </div>
            <div className="text-center">
              <p className="text-xl text-neutral-400 font-bold mb-2">还没有任何项目</p>
              <p className="text-neutral-600 text-sm">点击上方「新建项目」开始你的第一个爆款短剧制作</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" /> 立即立项
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const phase = PHASE_LABELS[project.currentPhase] || PHASE_LABELS[1];
              return (
                <a
                  key={project.projectId}
                  href={`/studio/${encodeURIComponent(project.projectId)}`}
                  className="group block bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-700 hover:shadow-xl hover:shadow-neutral-900/50 transition-all hover:-translate-y-1"
                >
                  {/* Cover */}
                  <div className="h-44 bg-neutral-800 relative overflow-hidden">
                    {project.coverUrl ? (
                      <img
                        src={project.coverUrl}
                        alt={project.projectName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                        <Film className="w-16 h-16 text-neutral-700" />
                      </div>
                    )}
                    {/* Phase badge */}
                    <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold border ${phase.color}`}>
                      <Layers className="w-3 h-3 inline mr-1" />{phase.label}
                    </div>
                    {/* Delete */}
                    <button
                      onClick={(e) => handleDelete(project.projectId, e)}
                      className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 text-neutral-400 hover:text-red-400 hover:bg-red-900/40 opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-500/30"
                      title="移到回收站"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors truncate">
                      {project.projectName}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(project.updatedAt)}
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 text-white">🎬 新建短剧项目</h2>
            <div className="mb-6">
              <label className="text-sm text-neutral-400 block mb-2">项目名称（将作为文件夹名称）</label>
              <input
                type="text"
                autoFocus
                className="w-full bg-black/60 border border-neutral-700 rounded-xl p-4 text-white text-lg focus:border-orange-500 focus:outline-none placeholder-neutral-600"
                placeholder="例如：鸭子职场风云"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 text-neutral-400 hover:text-white transition-colors rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? '创建中...' : '🚀 立项开工'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
