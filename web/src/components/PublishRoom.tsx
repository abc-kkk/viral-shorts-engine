'use client';

import React, { useState } from 'react';
import { useProject } from '@/lib/ProjectContext';

export default function PublishRoom() {
  const {
    publishInfo, setPublishInfo, getFullScriptContext,
    coverPrompts, coverImages, processingCovers,
    handleGenerateCoverPrompt, handleGenerateCoverAsset
  } = useProject();

  const [isGeneratingPublish, setIsGeneratingPublish] = useState(false);

  const handleCopy = async (text: string, e: React.MouseEvent<HTMLButtonElement>) => {
      await navigator.clipboard.writeText(text);
      const btn = e.currentTarget;
      const originalText = btn.innerHTML;
      btn.innerHTML = '✅ 已复制';
      btn.classList.add('text-emerald-400');
      setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove('text-emerald-400');
      }, 2000);
  };

  const handleGeneratePublishInfo = async () => {
    setIsGeneratingPublish(true);
    try {
      const res = await fetch('/api/generate-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: 'publish_info',
          fullScriptContext: getFullScriptContext()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (!data.douyinTitle || !data.description || !data.tags) {
         throw new Error("返回的数据结构不完整: " + JSON.stringify(data));
      }
      setPublishInfo(data);
    } catch (e: any) {
      alert("❌ 生成发布文案失败: " + e.message);
    } finally {
      setIsGeneratingPublish(false);
    }
  };

  return (
    <div className="animate-in slide-in-from-right-8 duration-500 w-full flex flex-col gap-8">
        <div className="text-left mb-4">
            <h2 className="text-3xl font-extrabold text-white mb-2">🚀 爆款分发中心</h2>
            <p className="text-neutral-400">视频已就绪，在这里生成各平台的引流文案和专属海报。</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Publish Info Module */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-4 shadow-xl relative z-10">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold text-neutral-300">📱 各平台发布文案</h3>
                    <button 
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow ${isGeneratingPublish ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105'}`}
                        onClick={handleGeneratePublishInfo}
                        disabled={isGeneratingPublish}
                    >
                        {isGeneratingPublish ? '✨ AI 提纯脑暴中...' : (publishInfo ? '✨ 重新生成发版文案' : '✨ 一键定制全网文案')}
                    </button>
                </div>
                
                {publishInfo ? (
                    <div className="flex flex-col gap-6 mt-4">
                        {/* Douyin */}
                        <div className="bg-black/50 border border-neutral-800 p-4 pt-6 rounded-xl relative group transition-all hover:border-indigo-600/50">
                            <span className="text-xs bg-neutral-800 text-neutral-400 px-3 py-1 rounded-md absolute -top-3 left-4 shadow border border-neutral-700 font-mono">🎵 抖音标题 (≤30字)</span>
                            <p className="text-neutral-200 text-base font-semibold selection:bg-indigo-500/50">{publishInfo.douyinTitle}</p>
                            <button onClick={(e) => handleCopy(publishInfo.douyinTitle, e)} className="absolute -top-3 right-4 opacity-0 group-hover:opacity-100 bg-neutral-700 hover:bg-indigo-600 px-3 py-1 rounded-md text-xs transition shadow-lg text-white font-bold">📋 复制</button>
                        </div>
                        {/* XHS */}
                        <div className="bg-black/50 border border-neutral-800 p-4 pt-6 rounded-xl relative group transition-all hover:border-indigo-600/50">
                            <span className="text-xs bg-neutral-800 text-neutral-400 px-3 py-1 rounded-md absolute -top-3 left-4 shadow border border-neutral-700 font-mono">📕 小红书标题 (≤20字)</span>
                            <p className="text-neutral-200 text-base font-semibold selection:bg-indigo-500/50">{publishInfo.xhsTitle}</p>
                            <button onClick={(e) => handleCopy(publishInfo.xhsTitle, e)} className="absolute -top-3 right-4 opacity-0 group-hover:opacity-100 bg-neutral-700 hover:bg-indigo-600 px-3 py-1 rounded-md text-xs transition shadow-lg text-white font-bold">📋 复制</button>
                        </div>
                        {/* Bilibili */}
                        <div className="bg-black/50 border border-neutral-800 p-4 pt-6 rounded-xl relative group transition-all hover:border-indigo-600/50">
                            <span className="text-xs bg-neutral-800 text-neutral-400 px-3 py-1 rounded-md absolute -top-3 left-4 shadow border border-neutral-700 font-mono">📺 B站整活标题</span>
                            <p className="text-neutral-200 text-base font-semibold selection:bg-indigo-500/50">{publishInfo.bilibiliTitle}</p>
                            <button onClick={(e) => handleCopy(publishInfo.bilibiliTitle, e)} className="absolute -top-3 right-4 opacity-0 group-hover:opacity-100 bg-neutral-700 hover:bg-indigo-600 px-3 py-1 rounded-md text-xs transition shadow-lg text-white font-bold">📋 复制</button>
                        </div>
                        {/* Description */}
                        <div className="bg-black/50 border border-neutral-800 p-4 pt-6 rounded-xl relative group transition-all hover:border-indigo-600/50">
                            <span className="text-xs bg-neutral-800 text-neutral-400 px-3 py-1 rounded-md absolute -top-3 left-4 shadow border border-neutral-700 font-mono">📝 万能通用短简介</span>
                            <p className="text-neutral-400 text-sm leading-relaxed selection:bg-indigo-500/50">{publishInfo.description}</p>
                            <button onClick={(e) => handleCopy(publishInfo.description, e)} className="absolute -top-3 right-4 opacity-0 group-hover:opacity-100 bg-neutral-700 hover:bg-indigo-600 px-3 py-1 rounded-md text-xs transition shadow-lg text-white font-bold">📋 复制</button>
                        </div>
                        {/* Tags */}
                        <div className="bg-black/50 border border-neutral-800 p-4 pt-6 rounded-xl relative group flex flex-col items-start gap-1 transition-all hover:border-indigo-600/50">
                            <span className="text-xs bg-neutral-800 text-neutral-400 px-3 py-1 rounded-md absolute -top-3 left-4 shadow border border-neutral-700 font-mono">📌 流量 Tags</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {(publishInfo.tags || []).map((t, idx) => (
                                    <span key={idx} className="bg-indigo-900/40 text-indigo-300 text-sm px-3 py-1 rounded-full border border-indigo-800/50">#{t}</span>
                                ))}
                            </div>
                            <button onClick={(e) => handleCopy(publishInfo.tags.map(t => `#${t}`).join(' '), e)} className="absolute -top-3 right-4 opacity-0 group-hover:opacity-100 bg-neutral-700 hover:bg-indigo-600 px-3 py-1 rounded-md text-xs transition shadow-lg text-white font-bold">📋 全部复制</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-neutral-600 border border-neutral-800 border-dashed rounded-xl mt-4">
                        <span className="text-4xl mb-4">✍️</span>
                        <p>点击上方按钮，让 AI 提炼各平台专属爆款文案</p>
                    </div>
                )}
            </div>

            {/* Cover Module */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-4 shadow-xl relative z-10">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold text-neutral-300">🎨 独家定版封面 (Cover Art)</h3>
                </div>
                
                <div className="flex flex-col gap-6 mt-4">
                    {['16:9', '4:3', '3:4'].map((ratio) => (
                        <div key={ratio} className="bg-black/50 border border-neutral-800 p-5 rounded-xl flex flex-col gap-4 transition-all hover:border-neutral-600">
                            <div className="flex justify-between items-center flex-wrap gap-4">
                                <span className="text-sm font-bold text-neutral-300 font-mono bg-neutral-800 px-3 py-1.5 rounded-lg shadow-inner">
                                    📐 规格 [{ratio}]
                                </span>
                                <div className="flex gap-3">
                                    <button 
                                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs text-indigo-300 font-bold rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
                                        onClick={() => handleGenerateCoverPrompt(ratio)}
                                        disabled={processingCovers[ratio] === 'prompt'}
                                    >
                                        {processingCovers[ratio] === 'prompt' ? "✨ 脑暴排版中..." : "🪄 1. 构思高质感海报"}
                                    </button>
                                    <button 
                                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-xs text-white font-bold rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed group relative"
                                        onClick={() => handleGenerateCoverAsset(ratio)}
                                        disabled={processingCovers[ratio] === 'image' || !coverPrompts[ratio]}
                                    >
                                        {processingCovers[ratio] === 'image' ? "⏳ 云端渲染中..." : "🖼️ 2. 注入 AI (生图)"}
                                        {!processingCovers[ratio] && coverPrompts[ratio] && (
                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-600/90 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                                警告：请先去 Google 页面将比例切换为 {ratio} ！！
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>
                            
                            {coverPrompts[ratio] && (
                                <p className="text-xs text-neutral-400 bg-neutral-950 p-4 rounded-lg border border-neutral-800/80 font-mono leading-relaxed break-words shadow-inner">
                                    {coverPrompts[ratio]}
                                </p>
                            )}
                            
                            {coverImages[ratio] && (
                                <div className="relative group rounded-xl overflow-hidden border-2 border-neutral-700 mt-2 hover:border-emerald-500 transition duration-300 shadow-lg">
                                    <img src={coverImages[ratio]} alt={`${ratio} Cover`} className="w-full max-h-72 object-contain bg-black" />
                                    
                                    <a href={coverImages[ratio]} download={`cover_${ratio.replace(':', '_')}.png`} className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 backdrop-blur-sm cursor-pointer z-10 text-emerald-400 hover:text-emerald-300 hover:bg-black/40">
                                        <span className="text-5xl mb-3 drop-shadow-xl">⬇️</span>
                                        <span className="font-bold text-base bg-black/50 px-4 py-1 rounded-full">一键无损下载封面大图</span>
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
}
