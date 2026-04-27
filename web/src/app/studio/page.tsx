'use client';

import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Sparkles, Trash2, Clock, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { useStudioStore } from '@/lib/studio/store/useStudioStore';
import type { FsScript } from '@/lib/studio/types';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
  analyzing: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ready: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  producing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  analyzing: '分析中',
  ready: '就绪',
  producing: '制作中',
};

export default function StudioPage() {
  const { scripts, loading, fetchScripts, createScript, deleteScript } = useStudioStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchScripts(); }, [fetchScripts]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const script = await createScript({
        title: newTitle.trim(),
        content: newContent.trim(),
        source: 'manual',
      });
      if (script) {
        setShowCreate(false);
        setNewTitle('');
        setNewContent('');
        window.location.href = `/studio/scripts/${script.id}`;
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('确定删除这个剧本吗？资产也会一起删除。')) return;
    await deleteScript(id);
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100">
      <div className="px-8 py-6 border-b border-neutral-800/50 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-3">
            <Sparkles className="text-amber-500 w-7 h-7" />
            自由创作室
          </h1>
          <p className="text-neutral-500 text-sm mt-1">先写剧本，AI 自动提取角色和场景</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-900/30 transition-all hover:-translate-y-0.5 text-sm"
        >
          <Plus className="w-4 h-4" /> 新建剧本
        </button>
      </div>

      <div className="px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : scripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 gap-6">
            <div className="w-24 h-24 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <FileText className="w-12 h-12 text-neutral-700" />
            </div>
            <div className="text-center">
              <p className="text-xl text-neutral-400 font-bold mb-2">还没有剧本</p>
              <p className="text-neutral-600 text-sm">先写一个剧本，AI 会自动帮你提取角色和场景</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" /> 创建第一个剧本
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {scripts.map((script) => (
              <a
                key={script.id}
                href={`/studio/scripts/${script.id}`}
                className="group block bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-900/10 transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                      {script.title}
                    </h3>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, script.id)}
                    className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {script.synopsis && (
                  <p className="text-neutral-500 text-sm mb-3 line-clamp-2">{script.synopsis}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${STATUS_COLORS[script.status] || STATUS_COLORS.draft}`}>
                      {STATUS_LABELS[script.status] || script.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-neutral-600 text-xs">
                    <Clock className="w-3 h-3" />
                    {formatDate(script.updatedAt)}
                    <ChevronRight className="w-3 h-3 group-hover:text-amber-400 transition-colors" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 text-white">新建剧本</h2>
            <div className="mb-4">
              <label className="text-sm text-neutral-400 block mb-2">剧本标题</label>
              <input
                type="text"
                autoFocus
                className="w-full bg-black/60 border border-neutral-700 rounded-xl p-3 text-white text-lg focus:border-amber-500 focus:outline-none placeholder-neutral-600"
                placeholder="例如：都市逆袭记"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              />
            </div>
            <div className="mb-6">
              <label className="text-sm text-neutral-400 block mb-2">剧本内容（可选，之后也能填）</label>
              <textarea
                className="w-full bg-black/60 border border-neutral-700 rounded-xl p-3 text-white focus:border-amber-500 focus:outline-none placeholder-neutral-600 resize-none"
                rows={8}
                placeholder={"把你的故事写在这里...\n\n角色、场景、道具 AI 会自动帮你提取出来"}
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
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
                disabled={creating || !newTitle.trim()}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? '创建中...' : '开始创作'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
