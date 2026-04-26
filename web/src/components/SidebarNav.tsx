'use client';

import React, { useState } from 'react';
import { Edit3, Trash2, Settings, ArrowLeft, Layers, PenTool, Users, Clapperboard, MonitorPlay, Send, Film } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import SettingsModal from './GlobalSettings';

export default function SidebarNav() {
  const { projectId, currentPhase, setCurrentPhase, handleClearProgress } = useProject();
  const [showSettings, setShowSettings] = useState(false);

  const phases = [
    { id: 1, label: '剧本室', icon: PenTool, color: 'orange', desc: 'AI Brainstorming' },
    { id: 2, label: '定妆室', icon: Users, color: 'blue', desc: 'Character Sheet' },
    { id: 3, label: '分镜区', icon: Clapperboard, color: 'purple', desc: 'Storyboard' },
    { id: 4, label: '渲染室', icon: Film, color: 'emerald', desc: 'Remotion Cut' },
    { id: 5, label: '发布中心', icon: Send, color: 'indigo', desc: 'Publish & Cover' },
  ];

  return (
    <>
      <div 
        className="h-screen border-r border-neutral-800 bg-neutral-900/50 backdrop-blur-md shadow-2xl flex flex-col z-10 sticky top-0 w-64"
      >
        {/* Header / Project Info */}
        <div className="p-5 border-b border-neutral-800/50 flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <a href="/" className="text-neutral-500 hover:text-white transition-colors p-1.5 hover:bg-neutral-800 rounded-lg shrink-0" title="回到项目列表">
                  <ArrowLeft className="w-5 h-5" />
                </a>
                <div className="flex items-center gap-2 overflow-hidden">
                    <Edit3 className="text-orange-500 w-5 h-5 shrink-0" />
                    <span className="text-white font-extrabold tracking-tight truncate" title={projectId}>{projectId}</span>
                </div>
            </div>
        </div>

        {/* Navigation Phases */}
        <div className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto">
           <div className="px-3 mb-2 text-xs font-bold text-neutral-600 uppercase tracking-widest">制片流水线</div>
           
           {phases.map(phase => {
               const isActive = currentPhase === phase.id;
               const isPassed = currentPhase > phase.id;
               
               // Phase 5 can be clicked if we are at least in Phase 4.
               const disabled = phase.id > currentPhase && !(currentPhase >= 4 && phase.id === 5);

               const colorClasses: Record<string, string> = {
                   orange: isActive ? 'bg-orange-600/20 text-orange-400 border-orange-500/50' : isPassed ? 'text-orange-600' : 'text-neutral-500 hover:bg-neutral-800',
                   blue: isActive ? 'bg-blue-600/20 text-blue-400 border-blue-500/50' : isPassed ? 'text-blue-600' : 'text-neutral-500 hover:bg-neutral-800',
                   purple: isActive ? 'bg-purple-600/20 text-purple-400 border-purple-500/50' : isPassed ? 'text-purple-600' : 'text-neutral-500 hover:bg-neutral-800',
                   emerald: isActive ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50' : isPassed ? 'text-emerald-600' : 'text-neutral-500 hover:bg-neutral-800',
                   indigo: isActive ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50' : isPassed ? 'text-indigo-600' : 'text-neutral-500 hover:bg-neutral-800',
               };

               const activeClass = colorClasses[phase.color];

               return (
                   <button
                        key={phase.id}
                        onClick={() => !disabled && setCurrentPhase(phase.id)}
                        disabled={disabled}
                        className={`flex items-center gap-3 p-3 rounded-xl border border-transparent transition-all w-full ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} ${activeClass}`}
                   >
                        <phase.icon className={`w-5 h-5 shrink-0 ${isActive ? '' : 'opacity-70'}`} />
                        <div className="flex flex-col items-start flex-1 overflow-hidden">
                            <span className="font-bold text-sm whitespace-nowrap">{phase.id}. {phase.label}</span>
                            <span className="text-[10px] opacity-60 font-mono truncate">{phase.desc}</span>
                        </div>
                   </button>
               );
           })}
        </div>

        {/* Footer Tools */}
        <div className="p-3 border-t border-neutral-800/50 flex flex-col gap-2">
            <a
              href="/prompt-studio"
              target="_blank"
              className="flex items-center gap-3 p-3 rounded-xl text-neutral-400 hover:text-indigo-400 hover:bg-neutral-800/50 transition-colors cursor-pointer"
              title="提示词工作室 (Prompt Studio)"
            >
              <Layers className="w-5 h-5 shrink-0" />
              <span className="text-sm font-bold whitespace-nowrap">Prompt Studio</span>
            </a>

            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-3 p-3 rounded-xl text-neutral-400 hover:text-orange-400 hover:bg-neutral-800/50 transition-colors cursor-pointer"
              title="项目设置"
            >
              <Settings className="w-5 h-5 shrink-0" />
              <span className="text-sm font-bold whitespace-nowrap">项目设置</span>
            </button>

            <button
              onClick={handleClearProgress}
              className="flex items-center gap-3 p-3 rounded-xl text-red-500/70 hover:text-red-400 hover:bg-red-900/20 transition-colors cursor-pointer mt-2"
              title="清空进度"
            >
              <Trash2 className="w-5 h-5 shrink-0" />
              <span className="text-sm font-bold whitespace-nowrap">清空全剧数据</span>
            </button>
        </div>
      </div>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
