'use client';

import React, { useState } from 'react';
import { X, Pencil, Check } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import { ART_STYLE_PRESETS } from '@/lib/constants';
import { toast } from '@/lib/toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const { projectId, flowUrl, setFlowUrl, artStyle, setArtStyle, aiProvider, setAiProvider } = useProject();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(projectId);
  const [renaming, setRenaming] = useState(false);

  if (!open) return null;

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === projectId) {
      setIsRenaming(false);
      return;
    }
    setRenaming(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: newName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        // 跳转到新 URL
        window.location.href = `/studio/${encodeURIComponent(data.newProjectId)}`;
      } else {
        toast.error('重命名失败: ' + data.error);
      }
    } catch (e: any) {
      toast.error('重命名失败: ' + e.message);
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">⚙️ 项目设置</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {/* Project Name */}
          <div>
            <label className="text-sm font-bold text-neutral-300 block mb-2">📂 项目名称</label>
            {isRenaming ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  className="flex-1 bg-black/60 border border-orange-500 rounded-lg p-3 text-white text-sm focus:outline-none"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsRenaming(false); }}
                />
                <button onClick={handleRename} disabled={renaming} className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
                  <Check className="w-4 h-4" /> {renaming ? '...' : '确认'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-white text-lg font-bold">{projectId}</span>
                <button 
                  onClick={() => { setNewName(projectId); setIsRenaming(true); }}
                  className="p-1.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-orange-400 transition-colors"
                  title="重命名"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-xs text-neutral-600 mt-1.5">修改项目名称会同时重命名文件夹，页面将自动跳转。</p>
          </div>

          <div className="h-px bg-neutral-800 w-full" />

          {/* AI Provider */}
          <div>
            <label className="text-sm font-bold text-neutral-300 block mb-2">🧠 全局文本大模型 (AI Provider)</label>
            <select 
              className="w-full bg-black/60 border border-neutral-700 rounded-lg p-3 text-neutral-300 font-bold text-sm focus:border-orange-500 focus:outline-none cursor-pointer"
              value={aiProvider}
              onChange={e => setAiProvider(e.target.value as 'gemini' | 'doubao')}
            >
              <option value="gemini">Gemini (默认)</option>
              <option value="doubao">豆包 Doubao</option>
            </select>
            <p className="text-xs text-neutral-600 mt-1.5">此选项将决定项目中所有剧本创作、分镜拆解及提示词润色等文本工作所使用的大语言模型。</p>
          </div>

          <div className="h-px bg-neutral-800 w-full" />

          {/* Flow URL */}
          <div>
            <label className="text-sm font-bold text-neutral-300 block mb-2">🔗 Google Flow 项目大本营网址</label>
            <input 
              type="text"
              className="w-full bg-black/60 border border-neutral-700 rounded-lg p-3 text-white font-mono text-sm focus:border-orange-500 focus:outline-none"
              value={flowUrl}
              onChange={e => setFlowUrl(e.target.value)}
              placeholder="留空则读取 .env 配置。格式: https://labs.google/fx/.../project/xyz..."
            />
            <p className="text-xs text-neutral-600 mt-1.5">把你在云端建好的 Flow 网址填这，引擎全自动认路停靠。</p>
          </div>

          <div className="h-px bg-neutral-800 w-full" />

          {/* Art Style */}
          <div>
            <label className="text-sm font-bold text-neutral-300 block mb-2">🎨 全局核心画风 (Global Art Style)</label>
            <select 
              className="w-full bg-black/60 border border-neutral-700 rounded-lg p-3 text-neutral-300 font-bold text-sm focus:border-emerald-500 focus:outline-none cursor-pointer mb-2"
              onChange={e => { if(e.target.value) setArtStyle(e.target.value); }}
              value=""
            >
              <option value="" disabled>-- 快速套用预设画风模板 --</option>
              {ART_STYLE_PRESETS.map((preset, i) => (
                <option key={i} value={preset.value}>{preset.label}</option>
              ))}
            </select>
            <input 
              type="text"
              className="w-full bg-black/80 border border-neutral-700 rounded-lg p-3 text-emerald-400 font-mono text-sm focus:border-emerald-500 focus:outline-none"
              value={artStyle}
              onChange={e => setArtStyle(e.target.value)}
              placeholder="也可以在此直接手写自定义的纯英文长画风描述..."
            />
            <p className="text-xs text-neutral-600 mt-1.5">此画风将贯彻到后续的每一个角色、每一幕分镜中，确保视觉一致性。</p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors font-bold">
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
