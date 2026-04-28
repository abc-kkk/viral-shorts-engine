'use client';

import React, { useState } from 'react';
import { Camera, CheckCircle2, LayoutTemplate, PenLine, Image as ImageIcon2, Film, ArrowLeft } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import StoryboardLayoutTab from './storyboard/StoryboardLayoutTab';
import StoryboardPromptTab from './storyboard/StoryboardPromptTab';
import StoryboardFramesTab from './storyboard/StoryboardFramesTab';
import StoryboardMediaTab from './storyboard/StoryboardMediaTab';

import { useProjectStore } from '@/lib/store/useProjectStore';

export default function StoryboardPanel() {
  const {
    currentPhase, setCurrentPhase,
  } = useProject();

  const scriptLines = useProjectStore(s => s.scriptLines);
  const activeSceneIndex = useProjectStore(s => s.activeSceneIndex);
  const setActiveSceneIndex = useProjectStore(s => s.setActiveSceneIndex);
  const sceneVideos = useProjectStore(s => s.sceneVideos);

  if (currentPhase !== 3) return null;

  return (
    <div className="flex gap-6 w-full h-[calc(100vh-120px)] animate-in slide-in-from-right-8 duration-500">
        
        {/* LEFT SIDEBAR: Scene Navigation */}
        <div className="w-56 md:w-64 lg:w-80 flex-shrink-0 flex flex-col bg-neutral-900/60 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-xl h-full">
            <div className="p-4 border-b border-neutral-800 bg-neutral-900">
                <h3 className="text-lg font-bold text-neutral-200 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-purple-400" /> 分镜导航
                </h3>
                <p className="text-xs text-neutral-500 mt-1">共 {scriptLines.length} 幕</p>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1">
                {scriptLines.map((line, idx) => {
                    const isActive = activeSceneIndex === idx;
                    const hasVideo = !!sceneVideos[idx];
                    const isSystemRole = line.speaker === '字卡' || line.speaker === '旁白';
                    const isDone = hasVideo || isSystemRole;

                    return (
                        <button
                            key={idx}
                            onClick={() => setActiveSceneIndex(idx)}
                            className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer ${
                                isActive 
                                    ? 'bg-purple-900/20 border-purple-500/50 shadow-sm' 
                                    : 'border-transparent hover:bg-neutral-800/50 text-neutral-400'
                            }`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs font-bold ${isActive ? 'text-purple-400' : 'text-neutral-500'}`}>幕 {idx + 1}</span>
                                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                            </div>
                            <div className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-neutral-300'}`}>
                                {line.speaker}
                            </div>
                            <div className="text-xs text-neutral-500 truncate mt-0.5">
                                {line.dialogue || line.actionHint || "无台词"}
                            </div>
                            {line.props && line.props.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                    {line.props.map((p, i) => (
                                        <span key={i} className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/30 truncate max-w-[80px]">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>

        {/* RIGHT AREA: Waterfall Details */}
        <div className="flex-1 overflow-y-auto custom-scrollbar rounded-2xl pb-32 pr-2">
            {activeSceneIndex < scriptLines.length ? (
                <div className="flex flex-col gap-8 max-w-5xl mx-auto">
                    {/* Header Context */}
                    <div className="bg-gradient-to-r from-purple-900/40 to-neutral-900 border border-purple-500/30 rounded-2xl p-6 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500" />
                        <div className="text-sm text-purple-300/70 mb-1 font-bold">正在制作第 {activeSceneIndex + 1} 幕分镜：</div>
                        <div className="text-2xl text-white font-bold mb-2">
                            {scriptLines[activeSceneIndex].speaker}: &quot;{scriptLines[activeSceneIndex].dialogue}&quot;
                        </div>
                        <div className="text-neutral-400 text-sm">
                            动作提示: {scriptLines[activeSceneIndex].actionHint}
                        </div>
                        {scriptLines[activeSceneIndex].props && scriptLines[activeSceneIndex].props.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-purple-500/20 flex items-center gap-2">
                                <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-md border border-orange-500/20">📦 关键道具</span>
                                <div className="flex flex-wrap gap-2">
                                    {scriptLines[activeSceneIndex].props.map((p, i) => (
                                        <span key={i} className="text-xs text-neutral-300 font-medium">{@${p}}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Waterfall Sections */}
                    <div className="flex flex-col gap-6">
                        {/* 1. Layout */}
                        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 shadow-md hover:border-neutral-700 transition-colors">
                            <h4 className="text-lg font-bold text-neutral-300 mb-6 flex items-center gap-2 border-b border-neutral-800 pb-3">
                                <LayoutTemplate className="w-5 h-5 text-indigo-400"/> 1. 场景与布局 (Layout)
                            </h4>
                            <StoryboardLayoutTab />
                        </div>

                        {/* 2. Prompts */}
                        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 shadow-md hover:border-neutral-700 transition-colors">
                            <h4 className="text-lg font-bold text-neutral-300 mb-6 flex items-center gap-2 border-b border-neutral-800 pb-3">
                                <PenLine className="w-5 h-5 text-blue-400"/> 2. 智能提示词 (Prompts)
                            </h4>
                            <StoryboardPromptTab />
                        </div>

                        {/* 3. Frames */}
                        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 shadow-md hover:border-neutral-700 transition-colors">
                            <h4 className="text-lg font-bold text-neutral-300 mb-6 flex items-center gap-2 border-b border-neutral-800 pb-3">
                                <ImageIcon2 className="w-5 h-5 text-emerald-400"/> 3. 首尾帧抽卡 (Keyframes)
                            </h4>
                            <StoryboardFramesTab />
                        </div>

                        {/* 4. Media */}
                        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 shadow-md hover:border-neutral-700 transition-colors">
                            <h4 className="text-lg font-bold text-neutral-300 mb-6 flex items-center gap-2 border-b border-neutral-800 pb-3">
                                <Film className="w-5 h-5 text-orange-400"/> 4. 视频与配音 (Media & Audio)
                            </h4>
                            <StoryboardMediaTab />
                        </div>
                    </div>

                    {/* NAVIGATION */}
                    <div className="pt-8 flex gap-4">
                        {activeSceneIndex > 0 && (
                            <button 
                                    onClick={() => {
                                        setActiveSceneIndex(i => i - 1);
                                        // Scroll back to top of the right pane when navigating
                                        document.querySelector('.custom-scrollbar')?.scrollTo({top: 0, behavior: 'smooth'});
                                    }}
                                    className="w-1/4 py-4 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2 transition-all bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 cursor-pointer"
                            >
                                    <ArrowLeft className="w-4 h-4" /> 上一幕
                            </button>
                        )}
                        <button 
                                onClick={() => {
                                    if(activeSceneIndex === scriptLines.length - 1) {
                                        setCurrentPhase(4);
                                    } else {
                                        setActiveSceneIndex(i => i + 1);
                                        document.querySelector('.custom-scrollbar')?.scrollTo({top: 0, behavior: 'smooth'});
                                    }
                                }}
                                disabled={!sceneVideos[activeSceneIndex] && scriptLines[activeSceneIndex]?.speaker !== '字卡'}
                                className="flex-1 py-4 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2 transition-all disabled:bg-neutral-800 disabled:text-neutral-500 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 cursor-pointer"
                        >
                                <CheckCircle2 className="w-5 h-5"/> 
                                {activeSceneIndex === scriptLines.length - 1 ? "所有分镜通过，进入组装室" : "本幕完成，前往下一幕"}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    </div>
  );
}
