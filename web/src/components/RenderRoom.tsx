'use client';

import React from 'react';
import { Player } from '@remotion/player';
import { SkitVideo } from '@/remotion/SkitVideo';
import { useProject } from '@/lib/ProjectContext';

function SyncThumbnailPlayer({ videoSrc, audioSrc, audioDelay, trimStart, trimEnd, speaker, index }: { 
    videoSrc?: string, audioSrc?: string, audioDelay: number, trimStart: number, trimEnd: number, speaker: string, index: number 
}) {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const audioRef = React.useRef<HTMLAudioElement>(null);
    const rafRef = React.useRef<number>(0);

    // Enforce trim bounds: when video loads, seek to trimStart
    const handleLoadedMetadata = () => {
        if (videoRef.current && trimStart > 0) {
            videoRef.current.currentTime = trimStart;
        }
    };

    const handlePlay = () => {
        const vid = videoRef.current;
        if (vid && vid.currentTime < trimStart) {
            vid.currentTime = trimStart;
        }
        // Start audio after audioDelay relative to trimStart
        if (audioRef.current && vid) {
            const elapsed = vid.currentTime - trimStart;
            const audioTime = Math.max(0, elapsed - audioDelay);
            audioRef.current.currentTime = audioTime;
            if (elapsed >= audioDelay) {
                audioRef.current.play().catch(() => {});
            } else {
                // Schedule audio start after remaining delay
                setTimeout(() => {
                    if (vid && !vid.paused && audioRef.current) {
                        audioRef.current.play().catch(() => {});
                    }
                }, (audioDelay - elapsed) * 1000);
            }
        }
        // Start monitoring for trimEnd
        startTrimMonitor();
    };

    const handlePause = () => {
        if (audioRef.current) audioRef.current.pause();
        cancelAnimationFrame(rafRef.current);
    };

    const handleSeek = () => {
        const vid = videoRef.current;
        if (!vid) return;
        // Clamp seek within trim bounds
        if (vid.currentTime < trimStart) vid.currentTime = trimStart;
        if (vid.currentTime > trimEnd) vid.currentTime = trimEnd;
        // Sync audio
        if (audioRef.current) {
            const elapsed = vid.currentTime - trimStart;
            audioRef.current.currentTime = Math.max(0, elapsed - audioDelay);
        }
    };

    const startTrimMonitor = () => {
        cancelAnimationFrame(rafRef.current);
        const check = () => {
            const vid = videoRef.current;
            if (vid && !vid.paused) {
                if (vid.currentTime >= trimEnd) {
                    vid.pause();
                    if (audioRef.current) audioRef.current.pause();
                    return;
                }
                rafRef.current = requestAnimationFrame(check);
            }
        };
        rafRef.current = requestAnimationFrame(check);
    };

    React.useEffect(() => {
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    const clipDuration = Math.max(0, trimEnd - trimStart).toFixed(1);

    return (
        <div className="w-full md:w-64 bg-black rounded-lg border border-neutral-800 overflow-hidden relative flex-shrink-0 flex flex-col shadow-inner group">
            {videoSrc ? (
                <video 
                    ref={videoRef}
                    src={videoSrc} 
                    className="w-full h-36 object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                    controls 
                    muted
                    preload="metadata"
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onSeeked={handleSeek}
                />
            ) : (
                <div className="w-full h-36 flex items-center justify-center">
                    <span className="text-neutral-600 text-xs text-center px-4">暂无视频<br/>首帧占位</span>
                </div>
            )}
            
            {audioSrc && (
                <audio ref={audioRef} src={audioSrc} style={{ display: 'none' }} />
            )}

            <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-xs font-bold text-neutral-300 pointer-events-none z-10">
                幕 {index + 1}: {speaker}
            </div>
            <div className="absolute top-2 right-2 bg-amber-600/90 px-2 py-0.5 rounded text-xs font-bold text-white pointer-events-none z-10">
                {clipDuration}s
            </div>
        </div>
    );
}

export default function RenderRoom() {
  const {
    projectId,
    scriptLines,
    sceneVideos,
    sceneDurations,
    sceneVideoTrimStart, setSceneVideoTrimStart,
    sceneVideoTrimEnd, setSceneVideoTrimEnd,
    sceneAudio,
    sceneAudioDelays, setSceneAudioDelays,
    setCurrentPhase
  } = useProject();

  return (
    <div className="animate-in slide-in-from-right-8 duration-500 w-full flex flex-col items-center pb-24">
         <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl shadow-2xl w-full flex flex-col lg:flex-row gap-12 relative overflow-hidden items-start">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 blur-[100px] rounded-full pointer-events-none"/>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-600/10 blur-[100px] rounded-full pointer-events-none"/>
              
              {/* LEFT PANE: Sticky Player */}
              <div className="lg:w-1/3 flex flex-col items-center gap-6 sticky top-8 self-start z-10">
                  <div className="text-center">
                      <h2 className="text-3xl font-extrabold text-white mb-2">🎬 非线性渲染室</h2>
                      <p className="text-neutral-400">细调时间轴轨道，并导出最高质量成品。</p>
                  </div>

                  <div className="rounded-2xl overflow-hidden border-4 border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-10 bg-black">
                        <Player
                          component={SkitVideo}
                          inputProps={{ 
                              dialogues: scriptLines.map(s => s.dialogue),
                              speakers: scriptLines.map(s => s.speaker),
                              clipUrls: scriptLines.map((_, i) => sceneVideos[i] || ""),
                              clipDurations: scriptLines.map((_, i) => sceneDurations[i] || 8.0),
                              clipAudioUrls: scriptLines.map((_, i) => sceneAudio[i] || ""),
                              clipAudioDelays: scriptLines.map((_, i) => sceneAudioDelays[i] || 0),
                              clipTrimStart: scriptLines.map((_, i) => sceneVideoTrimStart[i] ?? 0),
                              clipTrimEnd: scriptLines.map((_, i) => sceneVideoTrimEnd[i] ?? 8.0)
                          }}
                        durationInFrames={Math.max(1, scriptLines.reduce((acc, _, i) => {
                            const startSec = sceneVideoTrimStart[i] ?? 0;
                            const endSec = sceneVideoTrimEnd[i] ?? 8.0;
                            let d = endSec - startSec;
                            if (d <= 0) d = sceneDurations[i] || 8.0;
                            return acc + Math.round(d * 30);
                        }, 0))}
                        fps={30}
                        compositionWidth={1080}
                        compositionHeight={1920}
                        style={{ width: '320px', height: '568px' }}
                        controls
                        autoPlay
                        loop
                      />
                  </div>

                  <button 
                      onClick={async (e) => {
                          const btn = e.currentTarget;
                          const originalText = btn.innerHTML;
                          btn.innerHTML = '⏳ 全马力本地渲染中 (约需1-3分钟)...';
                          btn.disabled = true;
                          btn.classList.add('opacity-50', 'cursor-not-allowed', 'animate-pulse');
                          try {
                              const res = await fetch(`/api/export?projectId=${encodeURIComponent(projectId)}`, { method: 'POST' });
                              const data = await res.json();
                              if (res.ok) {
                                  alert(`✅ 绝赞落幕！成片已成功导出并保存至您的项目目录:\n${data.file}\n\n您可以去文件管理器里直接双击播放，或者拉进剪映/上架抖音了！`);
                                  setCurrentPhase(5); // 前往发布中心
                              } else {
                                  alert(`❌ 渲染遭遇滑铁卢:\n${data.error}\n\n请检查控制台获取详细报错。`);
                              }
                          } catch(err: any) {
                              alert(`❌ 渲染失联 (网络/环境错误):\n${err.message}`);
                          } finally {
                              btn.innerHTML = originalText;
                              btn.disabled = false;
                              btn.classList.remove('opacity-50', 'cursor-not-allowed', 'animate-pulse');
                          }
                      }}
                      className="w-full px-4 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-lg rounded-xl shadow-lg hover:scale-105 transition-all mt-4"
                  >
                      🚀 渲染导出 4K 视频
                  </button>
              </div>

              {/* RIGHT PANE: Timeline Controls */}
              <div className="lg:w-2/3 flex flex-col w-full z-10">
                  <h3 className="text-xl font-bold text-neutral-200 mb-6 flex items-center gap-2">
                       ⏱️ 多轨时间轴精调 (Timeline Editor)
                  </h3>
                  <div className="flex flex-col gap-6">
                      {scriptLines.map((line, i) => {
                          const isFallback = !sceneVideos[i];
                          // Override max bounds for empty title cards, giving users up to 10 seconds of headroom
                          const maxVidDuration = isFallback ? Math.max(10.0, sceneDurations[i] || 8.0) : (sceneDurations[i] || 8.0);
                          return (
                          <div key={i} className="bg-black/40 border border-neutral-700/60 p-5 rounded-2xl flex flex-col xl:flex-row gap-6 items-center shadow-lg hover:border-neutral-600 transition-colors">
                              {/* Thumbnail Area */}
                              <SyncThumbnailPlayer 
                                  videoSrc={sceneVideos[i]} 
                                  audioSrc={sceneAudio[i]} 
                                  audioDelay={sceneAudioDelays[i] || 0}
                                  trimStart={sceneVideoTrimStart[i] ?? 0}
                                  trimEnd={sceneVideoTrimEnd[i] ?? maxVidDuration}
                                  speaker={line.speaker} 
                                  index={i} 
                              />
                              
                              {/* Sliders Area */}
                              <div className="flex-1 flex flex-col gap-5 w-full">
                                  {/* Trim Start & End Sliders */}
                                  <div className="flex flex-col gap-2 w-full bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                                      <div className="flex justify-between items-center text-sm text-neutral-400 font-bold mb-1">
                                          <span>🎬 视频画面区间控制</span>
                                          <span className="text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded">
                                              实际出片 {(sceneVideoTrimEnd[i] ?? maxVidDuration) - (sceneVideoTrimStart[i] ?? 0)}s
                                          </span>
                                      </div>
                                      
                                      <div className="flex items-center gap-4">
                                          <span className="text-xs text-neutral-500 w-8 text-right shrink-0">入点</span>
                                          <input 
                                              type="range" min="0" max={maxVidDuration} step="0.1"
                                              value={sceneVideoTrimStart[i] ?? 0}
                                              onChange={(e) => setSceneVideoTrimStart(d => ({...d, [i]: parseFloat(e.target.value)}))}
                                              className="flex-1 accent-emerald-500 cursor-pointer"
                                          />
                                          <span className="text-xs text-emerald-500 font-mono w-8">{sceneVideoTrimStart[i] ?? 0}s</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-4">
                                          <span className="text-xs text-neutral-500 w-8 text-right shrink-0">出点</span>
                                          <input 
                                              type="range" min="0.1" max={maxVidDuration} step="0.1"
                                              value={sceneVideoTrimEnd[i] ?? maxVidDuration}
                                              onChange={(e) => setSceneVideoTrimEnd(d => ({...d, [i]: parseFloat(e.target.value)}))}
                                              className="flex-1 accent-red-500 cursor-pointer"
                                          />
                                          <span className="text-xs text-red-500 font-mono w-8">{sceneVideoTrimEnd[i] ?? maxVidDuration}s</span>
                                      </div>
                                  </div>

                                  {/* Audio Delay Slider */}
                                  <div className="flex flex-col gap-2 w-full bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                                      <div className="flex justify-between items-center text-sm text-neutral-400 font-bold mb-1">
                                          <span>🎵 旁白 / 对白轨道延时</span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                          <span className="text-xs text-neutral-500 w-8 text-right shrink-0">起播</span>
                                          <input 
                                              type="range" min="0" max="10" step="0.1"
                                              value={sceneAudioDelays[i] || 0}
                                              onChange={(e) => setSceneAudioDelays(d => ({...d, [i]: parseFloat(e.target.value)}))}
                                              className="flex-1 accent-blue-500 cursor-pointer"
                                          />
                                          <span className="text-xs text-blue-400 font-mono w-8">{sceneAudioDelays[i] || 0}s</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )})}
                  </div>
              </div>
         </div>
    </div>
  );
}
