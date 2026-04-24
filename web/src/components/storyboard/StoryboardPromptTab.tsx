'use client';

import React from 'react';
import { useProject } from '@/lib/ProjectContext';

export default function StoryboardPromptTab() {
  const {
    activeSceneIndex,
    sceneStartImagePrompts, setSceneStartImagePrompts,
    sceneImagePrompts, setSceneImagePrompts,
    sceneVideoPrompts, setSceneVideoPrompts,
    processingScene,
    handleGenerateActionPrompt,
  } = useProject();

  const isFirstScene = activeSceneIndex === 0;

  return (
    <div className="border border-neutral-800 rounded-xl p-6 bg-black/40 flex flex-col gap-6 animate-in fade-in duration-300">
       <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="font-bold text-lg text-purple-400">智能推演中文提示词</div>
            <button 
               onClick={() => handleGenerateActionPrompt(activeSceneIndex)}
               disabled={processingScene[activeSceneIndex] === 'action'}
               className="px-4 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-lg shadow-purple-900/50"
            >
                {processingScene[activeSceneIndex] === 'action' ? "🧠 AI 推演中..." : "全剧本理解 ➔ 生成本幕提示词"}
            </button>
       </div>
       
       {isFirstScene && (
           <div className="flex flex-col gap-2">
               <div className="text-sm text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-2">
                   <span>🎬 首帧图提示词</span>
                   <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded">仅第 1 镜需要</span>
               </div>
               <textarea 
                  className="w-full bg-black/60 border border-emerald-900/50 rounded-lg p-4 text-emerald-300 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed transition-all shadow-inner"
                  rows={4} 
                  value={sceneStartImagePrompts[activeSceneIndex] || ""} 
                  onChange={e => setSceneStartImagePrompts(p => ({...p, [activeSceneIndex]: e.target.value}))}
                  placeholder="描述视频开始时的静态画面..."
               />
           </div>
       )}

       <div className="flex flex-col gap-2">
           <div className="text-sm text-blue-400 font-bold uppercase tracking-wider flex items-center gap-2">
               <span>🖼️ 尾帧图提示词</span>
           </div>
           <textarea 
              className="w-full bg-black/60 border border-blue-900/50 rounded-lg p-4 text-blue-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed transition-all shadow-inner"
              rows={4} 
              value={sceneImagePrompts[activeSceneIndex] || ""} 
              onChange={e => setSceneImagePrompts(p => ({...p, [activeSceneIndex]: e.target.value}))}
              placeholder="描述视频结束时的静态画面..."
           />
       </div>

       <div className="flex flex-col gap-2">
           <div className="text-sm text-amber-400 font-bold uppercase tracking-wider flex items-center gap-2">
               <span>🎥 视频动态提示词</span>
               <span className="text-xs bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded">含口播与运镜</span>
           </div>
           <textarea 
              className="w-full bg-black/60 border border-amber-900/50 rounded-lg p-4 text-amber-300 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none leading-relaxed transition-all shadow-inner"
              rows={6} 
              value={sceneVideoPrompts[activeSceneIndex] || ""} 
              onChange={e => setSceneVideoPrompts(p => ({...p, [activeSceneIndex]: e.target.value}))}
              placeholder="描述从首帧到尾帧的完整动态过程、运镜和口播..."
           />
       </div>
    </div>
  );
}
