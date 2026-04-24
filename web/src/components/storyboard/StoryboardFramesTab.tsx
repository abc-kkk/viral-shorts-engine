'use client';

import React from 'react';
import { ImageIcon } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import LocationPanel from '../LocationPanel';

export default function StoryboardFramesTab() {
  const {
    projectId,
    activeSceneIndex,
    sceneStartImages,
    sceneImages,
    sceneStartImagePrompts,
    sceneImagePrompts,
    processingScene,
    handleGenerateStartFrame,
    handleGenerateEndFrame,
    startLayoutPrompts, setStartLayoutPrompts,
    endLayoutPrompts, setEndLayoutPrompts,
  } = useProject();

  const isFirstScene = activeSceneIndex === 0;
  const inheritedStartImage = !isFirstScene ? sceneImages[activeSceneIndex - 1] : undefined;

  return (
    <div className="border border-neutral-800 rounded-xl p-6 bg-black/40 flex flex-col md:flex-row gap-6 animate-in fade-in duration-300">
        {/* 首帧图 */}
        <div className="flex-1 md:border-r border-neutral-800 md:pr-6 flex flex-col gap-4">
            <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800/50">
                    <div className="font-bold text-lg text-emerald-400">
                        2a. 首帧图 {isFirstScene ? '' : <span className="text-sm font-normal text-neutral-500 ml-2">（继承自上一镜尾帧）</span>}
                    </div>
                </div>
                
                <div className="relative group rounded-xl overflow-hidden flex-1 flex flex-col bg-neutral-900 border border-emerald-900/30">
                    {isFirstScene ? (
                        <>
                            {sceneStartImages[activeSceneIndex] ? (
                                <img src={sceneStartImages[activeSceneIndex]} className="w-full h-64 object-contain bg-black" alt="Start Frame" />
                            ) : (
                                <div className="flex-1 min-h-[16rem] w-full flex flex-col justify-center items-center text-neutral-600 gap-2">
                                    <ImageIcon className="w-8 h-8 opacity-20" />
                                    <span className="text-sm">暂无首帧</span>
                                </div>
                            )}
                            <div className="absolute bottom-3 right-3">
                                <button 
                                    onClick={() => handleGenerateStartFrame(activeSceneIndex)}
                                    disabled={!sceneStartImagePrompts[activeSceneIndex] || !!processingScene[activeSceneIndex]}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded shadow-xl hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 flex items-center gap-2 font-medium transition-all"
                                >
                                    <ImageIcon className="w-4 h-4"/> 
                                    {processingScene[activeSceneIndex] === 'startImage' ? '生成中...' : '生成首帧 (Nano Pro)'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {inheritedStartImage ? (
                                <img src={inheritedStartImage} className="w-full h-64 object-contain bg-black opacity-80" alt="Inherited Start Frame" />
                            ) : (
                                <div className="flex-1 min-h-[16rem] w-full flex flex-col justify-center items-center text-neutral-600 gap-2">
                                    <ImageIcon className="w-8 h-8 opacity-20" />
                                    <span className="text-sm">等待上一镜生成尾帧...</span>
                                </div>
                            )}
                            <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm text-emerald-300 rounded-lg text-xs font-medium border border-emerald-500/20 shadow-lg">
                                🔗 自动链接
                            </div>
                        </>
                    )}
                </div>
            </div>

            {isFirstScene && (
                <LocationPanel
                    title="🧍 首帧站位 3D 布局 (可选)"
                    description="设置首帧画面中人物的空间结构"
                    prompt={startLayoutPrompts[activeSceneIndex] || ''}
                    onPromptChange={(p) => setStartLayoutPrompts(prev => ({ ...prev, [activeSceneIndex]: p }))}
                    image={''}
                    isProcessingPrompt={false}
                    isProcessingImage={false}
                    onGeneratePrompt={() => {}}
                    onGenerateImage={() => {}}
                    projectId={projectId}
                    isCollapsible={true}
                    hideImageGeneration={true}
                />
            )}
        </div>

        {/* 尾帧图 */}
        <div className="flex-1 flex flex-col gap-4">
            <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800/50">
                    <div className="font-bold text-lg text-blue-400">2b. 尾帧图</div>
                </div>
                
                <div className="relative group rounded-xl overflow-hidden flex-1 flex flex-col bg-neutral-900 border border-blue-900/30">
                    {sceneImages[activeSceneIndex] ? (
                        <img src={sceneImages[activeSceneIndex]} className="w-full h-64 object-contain bg-black" alt="End Frame" />
                    ) : (
                        <div className="flex-1 min-h-[16rem] w-full flex flex-col justify-center items-center text-neutral-600 gap-2">
                            <ImageIcon className="w-8 h-8 opacity-20" />
                            <span className="text-sm">暂无尾帧</span>
                        </div>
                    )}
                    <div className="absolute bottom-3 right-3">
                        <button 
                            onClick={() => handleGenerateEndFrame(activeSceneIndex)}
                            disabled={!sceneImagePrompts[activeSceneIndex] || !!processingScene[activeSceneIndex]}
                            className="px-4 py-2 bg-blue-600 text-white rounded shadow-xl hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center gap-2 font-medium transition-all"
                        >
                            <ImageIcon className="w-4 h-4"/> 
                            {processingScene[activeSceneIndex] === 'image' ? '生成中...' : '生成尾帧 (Nano Pro)'}
                        </button>
                    </div>
                </div>
            </div>

            <LocationPanel
                title="🧍 尾帧站位 3D 布局 (可选)"
                description="设置尾帧画面中人物的运动落点"
                prompt={endLayoutPrompts[activeSceneIndex] || ''}
                onPromptChange={(p) => setEndLayoutPrompts(prev => ({ ...prev, [activeSceneIndex]: p }))}
                image={''}
                isProcessingPrompt={false}
                isProcessingImage={false}
                onGeneratePrompt={() => {}}
                onGenerateImage={() => {}}
                projectId={projectId}
                isCollapsible={true}
                hideImageGeneration={true}
            />
        </div>
    </div>
  );
}
