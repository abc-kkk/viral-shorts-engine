'use client';

import React, { useState } from 'react';
import { Camera, CheckCircle2, LayoutTemplate, PenLine, Image as ImageIcon2, Film } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import StoryboardLayoutTab from './storyboard/StoryboardLayoutTab';
import StoryboardPromptTab from './storyboard/StoryboardPromptTab';
import StoryboardFramesTab from './storyboard/StoryboardFramesTab';
import StoryboardMediaTab from './storyboard/StoryboardMediaTab';

export default function StoryboardPanel() {
  const {
    currentPhase, setCurrentPhase,
    scriptLines,
    activeSceneIndex, setActiveSceneIndex,
    sceneVideos,
  } = useProject();

  const [activeTab, setActiveTab] = useState<'layout' | 'prompt' | 'frames' | 'media'>('layout');

  if (currentPhase !== 3) return null;

  const tabs = [
    { id: 'layout', label: '1. 场景与布局', icon: LayoutTemplate },
    { id: 'prompt', label: '2. 智能提示词', icon: PenLine },
    { id: 'frames', label: '3. 首尾帧抽卡', icon: ImageIcon2 },
    { id: 'media',  label: '4. 视频与配音', icon: Film },
  ] as const;

  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-right-8 duration-500">
        <div className="flex justify-between items-center bg-purple-900/20 border border-purple-500/30 p-4 rounded-xl">
             <h3 className="text-xl font-bold text-purple-300 flex items-center gap-2">
                 <Camera className="w-5 h-5" /> 首尾帧分镜渲染 (第 {activeSceneIndex + 1} 幕 / 共 {scriptLines.length} 幕)
             </h3>
        </div>

        {activeSceneIndex < scriptLines.length ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl p-6 relative">
               <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
               
               <div className="mb-6">
                   <div className="text-sm text-neutral-500 mb-1">正在基于剧本上下文处理当前动作场景：</div>
                   <div className="text-xl text-white font-bold">{scriptLines[activeSceneIndex].speaker}: &quot;{scriptLines[activeSceneIndex].dialogue}&quot;</div>
                   <div className="text-neutral-400 text-sm mt-1">📌 {scriptLines[activeSceneIndex].actionHint}</div>
               </div>

               {/* TAB NAVIGATION */}
               <div className="flex bg-black/40 p-1 rounded-xl mb-6 shadow-inner border border-neutral-800/50">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                          isActive 
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' 
                            : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    )
                  })}
               </div>

               <div className="min-h-[400px]">
                   {activeTab === 'layout' && <StoryboardLayoutTab />}
                   {activeTab === 'prompt' && <StoryboardPromptTab />}
                   {activeTab === 'frames' && <StoryboardFramesTab />}
                   {activeTab === 'media' && <StoryboardMediaTab />}
               </div>

               {/* NAVIGATION */}
               <div className="pt-6 mt-6 border-t border-neutral-800 flex gap-4">
                   {activeSceneIndex > 0 && (
                       <button 
                            onClick={() => setActiveSceneIndex(i => i - 1)}
                            className="w-1/3 py-4 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2 transition-all bg-neutral-800 hover:bg-neutral-700 border border-neutral-600"
                       >
                            ⬅️ 返回上一幕
                       </button>
                   )}
                   <button 
                        onClick={() => {
                            if(activeSceneIndex === scriptLines.length - 1) {
                                setCurrentPhase(4);
                            } else {
                                setActiveSceneIndex(i => i + 1);
                                setActiveTab('layout'); // Auto-reset tab for next scene
                            }
                        }}
                        disabled={!sceneVideos[activeSceneIndex] && scriptLines[activeSceneIndex]?.speaker !== '字卡'}
                        className="flex-1 py-4 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2 transition-all disabled:bg-neutral-800 disabled:text-neutral-500 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400"
                   >
                        <CheckCircle2 className="w-5 h-5"/> 
                        {activeSceneIndex === scriptLines.length - 1 ? "所有分镜通过，进入组装室" : "本幕完成，前往下一幕"}
                   </button>
               </div>
            </div>
        ) : null}
    </div>
  );
}
