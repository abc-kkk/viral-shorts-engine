'use client';

import React from 'react';
import { Video, Mic } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import { VOICE_OPTIONS } from '@/lib/constants';

export default function StoryboardMediaTab() {
  const {
    activeSceneIndex,
    characters, updateCharacter,
    scriptLines,
    sceneDurations, setSceneDurations,
    sceneImages,
    sceneStartImages,
    sceneVideos, setSceneVideos,
    sceneAudio,
    sceneAudioDelays, setSceneAudioDelays,
    currentVideoTimes, setCurrentVideoTimes,
    processingScene,
    handleGenerateVideo,
    handleGenerateVoice,
  } = useProject();

  const isFirstScene = activeSceneIndex === 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
        {/* STEP 3: VEO 视频 */}
        <div className="border border-neutral-800 rounded-xl p-6 bg-black/40">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-800/50 pb-2">
                <div className="font-bold text-lg text-amber-400">3. Veo 3.1 视频渲染</div>
                <div className="flex items-center gap-2 bg-black px-3 py-1.5 rounded-lg border border-neutral-800">
                    <span className="text-xs text-neutral-500 font-medium">成片时长:</span>
                    <input 
                        type="number" 
                        min="1" max="8" step="0.5"
                        value={sceneDurations[activeSceneIndex] || 8.0} 
                        onChange={e => setSceneDurations(d => ({...d, [activeSceneIndex]: parseFloat(e.target.value)}))}
                        className="w-16 bg-transparent text-amber-400 font-bold border-none text-center focus:outline-none"
                    />
                    <span className="text-xs text-neutral-500">秒</span>
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
                {/* 渲染控制区 */}
                <div className="flex flex-col gap-4 md:w-1/3">
                    <button 
                        className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        onClick={() => handleGenerateVideo(activeSceneIndex)}
                        disabled={!sceneImages[activeSceneIndex] || !(isFirstScene ? sceneStartImages[activeSceneIndex] : sceneImages[activeSceneIndex - 1]) || !!processingScene[activeSceneIndex]}
                    >
                        <Video className="w-5 h-5" /> 
                        {processingScene[activeSceneIndex] === 'video' ? "首尾帧传递与渲染中..." : "渲染成片 (首帧→尾帧)"}
                    </button>
                    
                    <div className="flex flex-col gap-1 mt-auto">
                        <span className="text-xs text-neutral-500 font-medium">外部视频接管：</span>
                        <input 
                            type="text" 
                            placeholder="手动粘贴直链 URL (按回车确认)" 
                            className="w-full bg-neutral-900 border border-neutral-700 rounded text-xs px-3 py-2 focus:border-amber-500 focus:outline-none"
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

                {/* 视频预览区 */}
                <div className="relative group rounded-xl overflow-hidden flex-1 bg-neutral-900 border border-amber-900/30">
                    {sceneVideos[activeSceneIndex] ? (
                        <video 
                            src={sceneVideos[activeSceneIndex]} 
                            controls loop muted playsInline 
                            onTimeUpdate={e => {
                                const t = (e.target as HTMLVideoElement).currentTime;
                                setCurrentVideoTimes(prev => ({...prev, [activeSceneIndex]: t}));
                            }}
                            className="w-full h-full min-h-[16rem] object-cover bg-black" 
                        />
                    ) : (
                        <div className="w-full h-full min-h-[16rem] flex flex-col justify-center items-center text-neutral-600 gap-2">
                            <Video className="w-8 h-8 opacity-20" />
                            <span className="text-sm">等待首尾帧图并点击渲染...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* STEP 4: Voice TTS */}
        <div className="border border-neutral-800 rounded-xl p-6 bg-black/40 flex flex-col gap-4">
            <div className="font-bold text-lg text-cyan-400 flex items-center justify-between border-b border-neutral-800/50 pb-2">
                <span>4. AI Studio TTS 配音</span>
                {(() => {
                    const speakerIdx = characters.findIndex(c => c.name === scriptLines[activeSceneIndex]?.speaker);
                    if(speakerIdx >= 0) {
                        const charConfig = characters[speakerIdx];
                        return (
                            <select 
                                className="bg-black border border-cyan-900 rounded-lg px-3 py-1.5 w-auto text-cyan-300 font-bold text-sm focus:border-cyan-500 focus:outline-none cursor-pointer"
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

            <div className="flex flex-col md:flex-row items-center gap-6 mt-2">
                <button 
                    onClick={() => handleGenerateVoice(activeSceneIndex)}
                    disabled={processingScene[activeSceneIndex] === 'voice' || !scriptLines[activeSceneIndex]?.dialogue}
                    className="w-full md:w-auto px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 flex items-center justify-center gap-2 flex-shrink-0 transition-all"
                >
                    <Mic className="w-5 h-5"/> 
                    {processingScene[activeSceneIndex] === 'voice' ? "正在生成配音..." : "生成当前台词配音"}
                </button>
                
                {sceneAudio[activeSceneIndex] ? (
                    <div className="flex-1 w-full flex flex-col gap-3">
                        <audio src={sceneAudio[activeSceneIndex]} controls className="h-12 w-full rounded-lg outline-none" />
                        
                        <div className="flex flex-wrap items-center gap-3 bg-neutral-900 px-4 py-3 rounded-lg border border-neutral-800 self-end w-full shadow-inner">
                            <button 
                                onClick={() => setSceneAudioDelays(d => ({...d, [activeSceneIndex]: parseFloat((currentVideoTimes[activeSceneIndex] || 0).toFixed(1))}))}
                                className="text-sm font-bold bg-amber-600/20 text-amber-500 border border-amber-500/50 px-3 py-1.5 rounded-lg hover:bg-amber-600/40 transition-colors flex items-center gap-2 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                                title="在上方视频播放到某处时暂停，点击此按钮，即可让配音在这一时刻精准播放！"
                            >
                                📍 标记视频 ({(currentVideoTimes[activeSceneIndex] || 0).toFixed(1)}s) 为起声点
                            </button>
                            <div className="flex-1"></div>
                            <span className="text-sm text-neutral-400 font-medium">⏱️ 最终延迟:</span>
                            <div className="flex items-center gap-1 bg-black px-2 py-1 rounded border border-cyan-900/50">
                                <input 
                                    type="number" min="0" max="10" step="0.1"
                                    value={sceneAudioDelays[activeSceneIndex] || 0}
                                    onChange={e => setSceneAudioDelays(d => ({...d, [activeSceneIndex]: parseFloat(e.target.value)}))}
                                    className="w-16 bg-transparent text-cyan-400 font-bold text-center focus:outline-none"
                                />
                                <span className="text-xs text-neutral-500">s</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 w-full px-6 py-4 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center text-sm text-neutral-500">
                        点击左侧按钮，使用当前选择的声音模型生成对白配音 (.wav)
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
