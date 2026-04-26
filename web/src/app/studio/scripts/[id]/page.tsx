'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Edit3, Save, X, Wand2, Loader2, ArrowRight } from 'lucide-react';
import { useStudioStore } from '@/lib/studio/store/useStudioStore';

export default function ScriptEditPage() {
  const params = useParams();
  const router = useRouter();
  const scriptId = params.id as string;

  const {
    currentScript, loading, generating,
    selectScript, updateScript, generateScript,
  } = useStudioStore();

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // AI 生成状态
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiMode, setAiMode] = useState<'generate' | 'polish'>('generate');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenre, setAiGenre] = useState('');
  const [aiEpisodeCount, setAiEpisodeCount] = useState(1);

  useEffect(() => {
    if (scriptId) selectScript(scriptId);
  }, [scriptId, selectScript]);

  useEffect(() => {
    if (currentScript && editing) {
      setEditTitle(currentScript.title);
      setEditContent(currentScript.content);
    }
  }, [currentScript, editing]);

  // 剧本内容为空时自动显示 AI 面板
  useEffect(() => {
    if (currentScript && !currentScript.content?.trim() && !editing && !generating) {
      setShowAiPanel(true);
      setAiMode('generate');
    }
  }, [currentScript, editing, generating]);

  const handleSaveScript = async () => {
    if (!currentScript) return;
    await updateScript(currentScript.id, {
      title: editTitle.trim(),
      content: editContent.trim(),
    });
    setEditing(false);
  };

  const handleGenerate = async () => {
    if (!currentScript || !aiPrompt.trim()) return;
    await generateScript(currentScript.id, aiMode, aiPrompt.trim(), {
      genre: aiGenre || undefined,
      episodeCount: aiEpisodeCount > 1 ? aiEpisodeCount : undefined,
    });
    setShowAiPanel(false);
    setAiPrompt('');
  };

  const hasContent = currentScript?.content?.trim();

  if (loading || !currentScript) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 flex flex-col">
      {/* Header */}
      <div className="px-8 py-4 border-b border-neutral-800/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/studio" className="text-neutral-500 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </a>
          {editing ? (
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="text-xl font-bold bg-transparent border-b border-amber-500 focus:outline-none text-white"
            />
          ) : (
            <h1 className="text-xl font-bold text-white">{currentScript.title}</h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="p-2 text-neutral-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
              <button onClick={handleSaveScript} className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-lg">
                <Save className="w-3.5 h-3.5" /> 保存
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setShowAiPanel(!showAiPanel); setAiMode(hasContent ? 'polish' : 'generate'); }}
                disabled={generating}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold rounded-lg disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                {generating ? 'AI 创作中...' : hasContent ? 'AI 润色' : 'AI 生成'}
              </button>
              <button onClick={() => setEditing(true)} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg" title="手动编辑">
                <Edit3 className="w-4 h-4" />
              </button>
              {/* 下一步按钮 */}
              <button
                onClick={() => router.push(`/studio/scripts/${scriptId}/assets`)}
                disabled={!hasContent}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg disabled:opacity-30 disabled:cursor-not-allowed ml-2"
              >
                下一步 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 剧本内容区 - 全屏 */}
      <div className="flex-1 flex flex-col">
        <div className="px-6 py-3 border-b border-neutral-800/30 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-neutral-400">剧本内容</span>
          <span className="text-[10px] text-neutral-600 ml-2">
            {currentScript.content ? `${currentScript.content.length} 字` : ''}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
          {editing ? (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full h-full bg-transparent text-neutral-200 text-sm leading-relaxed focus:outline-none resize-none font-mono"
              placeholder="在这里写下你的剧本..."
            />
          ) : hasContent ? (
            <div className="text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap">
              {currentScript.content}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 flex items-center justify-center">
                <Wand2 className="w-8 h-8 text-violet-400" />
              </div>
              <div className="text-center">
                <p className="text-neutral-400 text-sm mb-1">还没有剧本内容</p>
                <p className="text-neutral-600 text-xs">点击「AI 生成」让 AI 帮你写，或点击 ✏️ 手动编写</p>
              </div>
              <button
                onClick={() => { setShowAiPanel(true); setAiMode('generate'); }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl"
              >
                <Wand2 className="w-4 h-4" /> AI 帮我写剧本
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI 生成/润色 面板 */}
      {showAiPanel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-neutral-900 border border-neutral-700/50 rounded-2xl w-[560px] max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">{aiMode === 'generate' ? 'AI 生成剧本' : 'AI 润色剧本'}</h3>
                  <p className="text-xs text-neutral-500">{aiMode === 'generate' ? '描述你的想法，AI 帮你写' : '告诉 AI 怎么改，帮你优化'}</p>
                </div>
              </div>
              <button onClick={() => setShowAiPanel(false)} className="text-neutral-500 hover:text-white p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <button onClick={() => setAiMode('generate')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${aiMode === 'generate' ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' : 'bg-neutral-800/50 text-neutral-500 border border-neutral-700/30 hover:text-neutral-300'}`}>
                  <Wand2 className="w-4 h-4" /> 从零生成
                </button>
                <button onClick={() => setAiMode('polish')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${aiMode === 'polish' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'bg-neutral-800/50 text-neutral-500 border border-neutral-700/30 hover:text-neutral-300'}`}>
                  AI 润色改写
                </button>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 mb-1.5 block">{aiMode === 'generate' ? '描述你想写的故事' : '告诉 AI 怎么改'}</label>
                <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="w-full h-32 bg-neutral-800/50 border border-neutral-700/50 rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/50 resize-none" placeholder={aiMode === 'generate' ? '例如：一个关于外卖小哥追逐音乐梦想的故事...' : '例如：把对话改得更有趣一点，增加搞笑元素...'} />
              </div>
              {aiMode === 'generate' && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-neutral-400 mb-1.5 block">类型</label>
                    <select value={aiGenre} onChange={e => setAiGenre(e.target.value)} className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none">
                      <option value="">不限</option>
                      <option value="喜剧">喜剧</option><option value="悬疑">悬疑</option><option value="爱情">爱情</option>
                      <option value="都市">都市</option><option value="古风">古风</option><option value="科幻">科幻</option>
                      <option value="恐怖">恐怖</option><option value="励志">励志</option>
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="text-xs font-bold text-neutral-400 mb-1.5 block">集数</label>
                    <input type="number" min={1} max={50} value={aiEpisodeCount} onChange={e => setAiEpisodeCount(Math.max(1, parseInt(e.target.value) || 1))} className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none" />
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-between">
              <button onClick={() => setShowAiPanel(false)} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-300">取消</button>
              <button onClick={handleGenerate} disabled={generating || !aiPrompt.trim()} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> AI 创作中...</> : <><Wand2 className="w-4 h-4" /> {aiMode === 'generate' ? '开始生成' : '开始润色'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
