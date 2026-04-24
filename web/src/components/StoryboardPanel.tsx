'use client';

import React from 'react';
import { Camera, Video, Mic, CheckCircle2, ImageIcon } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import { VOICE_OPTIONS } from '@/lib/constants';
import LocationPanel from './LocationPanel';

export default function StoryboardPanel() {
  const {
    currentPhase, setCurrentPhase,
    characters, updateCharacter,
    scriptLines, projectId,
    activeSceneIndex, setActiveSceneIndex,
    sceneLocationPrompts, setSceneLocationPrompts,
    sceneLocationImages, setSceneLocationImages,
    actionLayoutPrompts, setActionLayoutPrompts,
    handleGenerateSceneLocationPrompt, generateSceneLocationImage,
    sceneImagePrompts, setSceneImagePrompts,
    sceneVideoPrompts, setSceneVideoPrompts,
    sceneStartImagePrompts, setSceneStartImagePrompts,
    sceneDurations, setSceneDurations,
    sceneImages,
    sceneStartImages,
    sceneVideos, setSceneVideos,
    sceneAudio,
    sceneAudioDelays, setSceneAudioDelays,
    currentVideoTimes, setCurrentVideoTimes,
    processingScene,
    handleGenerateActionPrompt,
    handleGenerateEndFrame,
    handleGenerateStartFrame,
    handleGenerateVideo,
    handleGenerateVoice,
  } = useProject();

  if (currentPhase !== 3) return null;

  const isFirstScene = activeSceneIndex === 0;
  // 后续镜头的首帧 = 前一镜的尾帧
  const inheritedStartImage = !isFirstScene ? sceneImages[activeSceneIndex - 1] : undefined;

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

               <div className="flex flex-col gap-4">
                   <LocationPanel
                        title="🎯 自定义本幕独立场景 (可选)"
                        description="留空则默认使用全局场景"
                        prompt={sceneLocationPrompts[activeSceneIndex] || ''}
                        onPromptChange={(p) => setSceneLocationPrompts(prev => ({ ...prev, [activeSceneIndex]: p }))}
                        image={sceneLocationImages[activeSceneIndex] || ''}
                        isProcessingPrompt={processingScene[activeSceneIndex] === 'action'}
                        isProcessingImage={processingScene[activeSceneIndex] === 'action'}
                        onGeneratePrompt={(hint) => handleGenerateSceneLocationPrompt(activeSceneIndex, hint)}
                        onGenerateImage={(keywords) => generateSceneLocationImage(activeSceneIndex, keywords)}
                        projectId={projectId}
                        isCollapsible={true}
                   />

                   <LocationPanel
                        title="🧍 人物站位 3D 布局 (可选)"
                        description="仅包含人物方块的纯空间结构图，用于精准控制首尾帧站位"
                        prompt={actionLayoutPrompts[activeSceneIndex] || ''}
                        onPromptChange={(p) => setActionLayoutPrompts(prev => ({ ...prev, [activeSceneIndex]: p }))}
                        image={''}
                        isProcessingPrompt={false}
                        isProcessingImage={false}
                        onGeneratePrompt={() => {}}
                        onGenerateImage={() => {}}
                        projectId={projectId}
                        isCollapsible={true}
                        hideImageGeneration={true}
                   />

                   {/* STEP 1: 生成提示词 */}
                   <div className="border border-neutral-800 rounded-xl p-4 bg-black/40 flex flex-col gap-4">
                       <div className="flex items-center justify-between mb-1">
                            <div className="font-bold text-sm text-purple-400">1. AI 分镜提示词生成（中文首尾帧 + 视频动态）</div>
                            <button 
                               onClick={() => handleGenerateActionPrompt(activeSceneIndex)}
                               disabled={processingScene[activeSceneIndex] === 'action'}
                               className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-lg"
                            >
                                {processingScene[activeSceneIndex] === 'action' ? "🧠 AI 推演中..." : "全剧本理解 ➔ 生成中文提示词"}
                            </button>
                       </div>
                       
                       {/* 首帧提示词（仅第1镜显示） */}
                       {isFirstScene && (
                           <div className="flex flex-col gap-1">
                               <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">🎬 首帧图提示词（仅第1镜）</div>
                               <textarea 
                                  className="w-full bg-black/60 border border-emerald-900/50 rounded p-3 text-emerald-300 text-sm focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                                  rows={4} 
                                  value={sceneStartImagePrompts[activeSceneIndex] || ""} 
                                  onChange={e => setSceneStartImagePrompts(p => ({...p, [activeSceneIndex]: e.target.value}))}
                                  placeholder="描述视频开始时的静态画面..."
                               />
                           </div>
                       )}

                       {/* 尾帧提示词 */}
                       <div className="flex flex-col gap-1">
                           <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">🖼️ 尾帧图提示词</div>
                           <textarea 
                              className="w-full bg-black/60 border border-blue-900/50 rounded p-3 text-blue-300 text-sm focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                              rows={4} 
                              value={sceneImagePrompts[activeSceneIndex] || ""} 
                              onChange={e => setSceneImagePrompts(p => ({...p, [activeSceneIndex]: e.target.value}))}
                              placeholder="描述视频结束时的静态画面..."
                           />
                       </div>

                       {/* 视频动态提示词 */}
                       <div className="flex flex-col gap-1">
                           <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">🎥 视频动态提示词（含口播）</div>
                           <textarea 
                              className="w-full bg-black/60 border border-amber-900/50 rounded p-3 text-amber-300 text-sm focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                              rows={5} 
                              value={sceneVideoPrompts[activeSceneIndex] || ""} 
                              onChange={e => setSceneVideoPrompts(p => ({...p, [activeSceneIndex]: e.target.value}))}
                              placeholder="描述从首帧到尾帧的完整动态过程、运镜和口播..."
                           />
                       </div>
                   </div>

                   {/* STEP 2: 首帧 + 尾帧图 */}
                   <div className="border border-neutral-800 rounded-xl p-4 bg-black/40 flex gap-4">
                       {/* 首帧图 */}
                       <div className="flex-1 border-r border-neutral-800 pr-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="font-bold text-sm text-emerald-400">
                                    2a. 首帧图 {isFirstScene ? '' : '（自动继承上一镜尾帧）'}
                                </div>
                            </div>
                            <div className="relative group rounded overflow-hidden">
                                {isFirstScene ? (
                                    // 第1镜：显示独立生成的首帧
                                    <>
                                        {sceneStartImages[activeSceneIndex] ? (
                                            <img src={sceneStartImages[activeSceneIndex]} className="w-full h-48 object-cover bg-neutral-900 border border-emerald-500/50" alt="Start Frame" />
                                        ) : (
                                            <div className="w-full h-48 bg-neutral-900 border border-emerald-800 border-dashed flex justify-center items-center text-neutral-600 text-xs">暂无首帧</div>
                                        )}
                                        <button 
                                            onClick={() => handleGenerateStartFrame(activeSceneIndex)}
                                            disabled={!sceneStartImagePrompts[activeSceneIndex] || !!processingScene[activeSceneIndex]}
                                            className="absolute bottom-2 right-2 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs shadow-lg hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1"
                                        ><ImageIcon className="w-3 h-3"/> 生成首帧 (Nano Pro)</button>
                                    </>
                                ) : (
                                    // 后续镜头：自动显示前一镜尾帧
                                    <>
                                        {inheritedStartImage ? (
                                            <img src={inheritedStartImage} className="w-full h-48 object-cover bg-neutral-900 border border-neutral-600 opacity-80" alt="Inherited Start Frame" />
                                        ) : (
                                            <div className="w-full h-48 bg-neutral-900 border border-neutral-800 border-dashed flex justify-center items-center text-neutral-600 text-xs">等待上一镜尾帧...</div>
                                        )}
                                        <div className="absolute bottom-2 right-2 px-3 py-1.5 bg-neutral-700 text-neutral-300 rounded text-xs">
                                            🔗 自动继承第 {activeSceneIndex} 镜尾帧
                                        </div>
                                    </>
                                )}
                            </div>
                       </div>

                       {/* 尾帧图 */}
                       <div className="flex-1 pl-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="font-bold text-sm text-blue-400">2b. 尾帧图</div>
                            </div>
                            <div className="relative group rounded overflow-hidden">
                                {sceneImages[activeSceneIndex] ? (
                                    <img src={sceneImages[activeSceneIndex]} className="w-full h-48 object-cover bg-neutral-900 border border-blue-500/50" alt="End Frame" />
                                ) : (
                                    <div className="w-full h-48 bg-neutral-900 border border-blue-800 border-dashed flex justify-center items-center text-neutral-600 text-xs">暂无尾帧</div>
                                )}
                                <button 
                                    onClick={() => handleGenerateEndFrame(activeSceneIndex)}
                                    disabled={!sceneImagePrompts[activeSceneIndex] || !!processingScene[activeSceneIndex]}
                                    className="absolute bottom-2 right-2 px-3 py-1.5 bg-blue-600 text-white rounded text-xs shadow-lg hover:bg-blue-500 disabled:opacity-50 flex items-center gap-1"
                                ><ImageIcon className="w-3 h-3"/> 生成尾帧 (Nano Pro)</button>
                            </div>
                       </div>
                   </div>

                   {/* STEP 3: VEO 视频 */}
                   <div className="border border-neutral-800 rounded-xl p-4 bg-black/40">
                        <div className="flex items-center justify-between mb-3">
                            <div className="font-bold text-sm text-amber-400">3. Veo 3.1 首尾帧视频渲染</div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-500">成片时长:</span>
                                <input 
                                    type="number" 
                                    min="1" max="8" step="0.5"
                                    value={sceneDurations[activeSceneIndex] || 8.0} 
                                    onChange={e => setSceneDurations(d => ({...d, [activeSceneIndex]: parseFloat(e.target.value)}))}
                                    className="w-14 bg-black text-amber-400 font-bold border border-neutral-800 rounded px-1 py-0.5 text-center focus:border-amber-500 focus:outline-none"
                                />
                                <span className="text-xs text-neutral-500">秒</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button 
                                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                onClick={() => handleGenerateVideo(activeSceneIndex)}
                                disabled={!sceneImages[activeSceneIndex] || !(isFirstScene ? sceneStartImages[activeSceneIndex] : sceneImages[activeSceneIndex - 1]) || !!processingScene[activeSceneIndex]}
                            >
                                <Video className="w-5 h-5" /> 
                                {processingScene[activeSceneIndex] === 'video' ? "首尾帧传递中..." : "渲染成片 (首帧→尾帧)"}
                            </button>
                            
                            <div className="flex items-center gap-2 mt-2">
                                <input 
                                    type="text" 
                                    placeholder="或手动粘贴影片URL" 
                                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded text-xs px-2 py-1.5 focus:border-orange-500 focus:outline-none"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = e.currentTarget.value.trim();
                                            if (val) {
                                                setSceneVideos(v => ({...v, [activeSceneIndex]: val}));
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div className="relative group rounded overflow-hidden mt-4">
                            {sceneVideos[activeSceneIndex] ? (
                                <video 
                                    src={sceneVideos[activeSceneIndex]} 
                                    controls loop muted playsInline 
                                    onTimeUpdate={e => {
                                        const t = (e.target as HTMLVideoElement).currentTime;
                                        setCurrentVideoTimes(prev => ({...prev, [activeSceneIndex]: t}));
                                    }}
                                    className="w-full h-48 object-cover bg-neutral-900 border border-amber-500/50 shadow-lg shadow-amber-900/20" 
                                />
                            ) : (
                                <div className="w-full h-48 bg-neutral-900 border border-neutral-800 border-dashed flex justify-center items-center text-neutral-600 text-xs">等待首尾帧传递...</div>
                            )}
                        </div>
                   </div>

                   {/* STEP 4: Voice TTS */}
                   <div className="border border-neutral-800 rounded-xl p-4 bg-black/40 flex flex-col gap-3">
                       <div className="font-bold text-sm text-cyan-400 flex items-center justify-between">
                           <span>4. AI Studio TTS 配音</span>
                           {(() => {
                               const speakerIdx = characters.findIndex(c => c.name === scriptLines[activeSceneIndex]?.speaker);
                               if(speakerIdx >= 0) {
                                   const charConfig = characters[speakerIdx];
                                   return (
                                       <select 
                                            className="bg-black/80 border border-cyan-800 rounded px-2 py-1 w-auto text-cyan-300 font-bold text-xs focus:border-cyan-500 focus:outline-none cursor-pointer"
                                            value={charConfig.voiceName || "Zephyr"}
                                            onChange={(e) => updateCharacter(speakerIdx, 'voiceName', e.target.value)}
                                        >
                                            {VOICE_OPTIONS.map((g, idx) => (
                                                <optgroup key={idx} label={`[${charConfig.name}] ` + g.group}>
                                                    {g.options.map(o => <option key={o.id} value={o.id}>🎤 {o.label}</option>)}
                                                </optgroup>
                                            ))}
                                        </select>
                                   );
                               }
                               return null;
                           })()}
                       </div>
                       <div className="flex items-center gap-4">
                           <button 
                               onClick={() => handleGenerateVoice(activeSceneIndex)}
                               disabled={processingScene[activeSceneIndex] === 'voice' || !scriptLines[activeSceneIndex]?.dialogue}
                               className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-lg shadow-lg hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 flex items-center justify-center gap-2 flex-shrink-0"
                           >
                               <Mic className="w-4 h-4"/> 
                               {processingScene[activeSceneIndex] === 'voice' ? "正在生成配音..." : "生成配音"}
                           </button>
                           
                           {sceneAudio[activeSceneIndex] ? (
                               <div className="flex-1 flex flex-col gap-2">
                                   <audio src={sceneAudio[activeSceneIndex]} controls className="h-10 w-full rounded outline-none" />
                                   <div className="flex flex-wrap items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded border border-neutral-800 self-end justify-end w-full shadow-inner">
                                       <button 
                                          onClick={() => setSceneAudioDelays(d => ({...d, [activeSceneIndex]: parseFloat((currentVideoTimes[activeSceneIndex] || 0).toFixed(1))}))}
                                          className="text-xs font-bold bg-amber-600/20 text-amber-500 border border-amber-500/50 px-2 py-1 rounded hover:bg-amber-600/40 transition-colors flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                                          title="在上方视频播放到某处时暂停，点击此按钮，即可让配音在这一时刻精准播放！"
                                       >
                                          📍 标记视频 ({(currentVideoTimes[activeSceneIndex] || 0).toFixed(1)}s) 为起声点
                                       </button>
                                       <div className="flex-1"></div>
                                       <span className="text-xs text-neutral-400">⏱️ 最终起声延迟:</span>
                                       <input 
                                            type="number" min="0" max="10" step="0.1"
                                            value={sceneAudioDelays[activeSceneIndex] || 0}
                                            onChange={e => setSceneAudioDelays(d => ({...d, [activeSceneIndex]: parseFloat(e.target.value)}))}
                                            className="w-16 bg-black text-cyan-400 font-bold border border-cyan-800/50 rounded px-1 py-1 text-center focus:border-cyan-500 focus:outline-none shadow-[0_0_10px_rgba(34,211,238,0.1)]"
                                       />
                                   </div>
                               </div>
                           ) : (
                               <div className="flex-1 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded flex items-center text-xs text-neutral-500">
                                   点击左侧按钮生成当前台词配音 (.wav)
                               </div>
                           )}
                       </div>
                   </div>

                   {/* LOCK SCENE */}
                   <div className="pt-4 mt-2">
                       <button 
                            onClick={() => {
                                if(activeSceneIndex === scriptLines.length - 1) {
                                    setCurrentPhase(4);
                                } else {
                                    setActiveSceneIndex(i => i + 1);
                                }
                            }}
                            disabled={!sceneVideos[activeSceneIndex] && scriptLines[activeSceneIndex]?.speaker !== '字卡'}
                            className="w-full py-4 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2 transition-all disabled:bg-neutral-800 disabled:text-neutral-500 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400"
                       >
                            <CheckCircle2 className="w-5 h-5"/> 
                            {activeSceneIndex === scriptLines.length - 1 ? "所有分镜通过，进入组装室" : "本幕锁定，前往下一幕"}
                       </button>
                   </div>
               </div>
            </div>
        ) : null}
    </div>
  );
}
