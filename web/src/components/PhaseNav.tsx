/**
 * @deprecated 此组件未被任何页面引用，SidebarNav.tsx 是当前活跃的导航组件。
 * 保留此文件仅作参考，后续版本可安全删除。
 */
'use client';

import React, { useState } from 'react';
import { Edit3, Trash2, Settings, ArrowLeft, Layers } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import SettingsModal from './GlobalSettings';

export default function PhaseNav() {
  const { projectId, currentPhase, setCurrentPhase, handleClearProgress } = useProject();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <div className="border-b border-neutral-800 bg-neutral-900/50 p-5 z-10 sticky top-0 backdrop-blur-md shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a href="/" className="text-neutral-500 hover:text-white transition-colors" title="回到项目列表">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Edit3 className="text-orange-500 w-6 h-6" />
              <span className="text-white">{projectId}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-mono flex gap-2">
               <button onClick={() => setCurrentPhase(1)} className={`px-2 py-1 rounded cursor-pointer transition-colors ${currentPhase >= 1 ? 'bg-orange-600/30 text-orange-400 hover:bg-orange-600/50' : 'text-neutral-500 hover:bg-neutral-800'}`}>1. 剧本室</button>
               <button onClick={() => setCurrentPhase(2)} disabled={currentPhase < 2} className={`px-2 py-1 rounded ${currentPhase >= 2 ? 'bg-blue-600/30 text-blue-400 hover:bg-blue-600/50 cursor-pointer' : 'text-neutral-500 opacity-50 cursor-not-allowed'}`}>2. 定妆室</button>
               <button onClick={() => setCurrentPhase(3)} disabled={currentPhase < 3} className={`px-2 py-1 rounded ${currentPhase >= 3 ? 'bg-purple-600/30 text-purple-400 hover:bg-purple-600/50 cursor-pointer' : 'text-neutral-500 opacity-50 cursor-not-allowed'}`}>3. 画板区</button>
               <span className={`px-2 py-1 rounded ${currentPhase >= 4 ? 'bg-emerald-600/30 text-emerald-400' : 'text-neutral-500'}`}>4. 渲染</span>
            </div>

            <a
              href="/prompt-studio"
              target="_blank"
              className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-indigo-400 transition-colors flex items-center gap-1.5"
              title="提示词工作室 (Prompt Studio)"
            >
              <Layers className="w-5 h-5" />
            </a>

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-orange-400 transition-colors"
              title="项目设置"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={handleClearProgress}
              className="flex items-center gap-1.5 text-xs border border-red-900/50 hover:bg-red-900/30 text-red-400 px-2.5 py-1.5 rounded-full transition-colors font-mono"
            >
              <Trash2 className="w-3 h-3"/> 清空
            </button>
          </div>
        </div>
      </div>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
