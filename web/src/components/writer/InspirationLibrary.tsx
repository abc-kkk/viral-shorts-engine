'use client';

import React, { useState } from 'react';
import { Zap, Star, RefreshCw, X, Clipboard, PenTool, ChevronDown, ChevronUp } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import { useProjectStore } from '@/lib/store/useProjectStore';

const CATEGORY_OPTIONS = [
  { value: 'all', label: '全部分类', emoji: '✨' },
  { value: '萌宠治愈', label: '萌宠治愈', emoji: '🐾' },
  { value: '职场共鸣', label: '职场共鸣', emoji: '🏢' },
  { value: '独居生活', label: '独居生活', emoji: '🏠' },
  { value: '情感疗愈', label: '情感疗愈', emoji: '❤️‍🩹' },
  { value: '哲理感悟', label: '哲理感悟', emoji: '🍃' },
];

const CREATIVE_MODES = [
  { value: 'direct' as const, label: '🔥 直接用', desc: '把现成段子直接改编成剧本' },
  { value: 'adapt' as const, label: '✨ 二创', desc: '保留梗的精髓，写全新剧本' },
  { value: 'reference' as const, label: '📐 参考', desc: '仅参考风格，AI 自由发挥' },
];

export default function InspirationLibrary() {
  const {
    handleFetchRedditJokes, handleGenerateScript,
    handleAddManualInspiration, handleRemoveInspiration, handleSelectInspiration,
  } = useProject();

  const theme = useProjectStore(s => s.theme);
  const setTheme = useProjectStore(s => s.setTheme);
  const creativeMode = useProjectStore(s => s.creativeMode);
  const setCreativeMode = useProjectStore(s => s.setCreativeMode);
  const inspirations = useProjectStore(s => s.inspirations);
  const isFetchingReddit = useProjectStore(s => s.isFetchingReddit);
  const userDirection = useProjectStore(s => s.userDirection);
  const setUserDirection = useProjectStore(s => s.setUserDirection);
  const isGeneratingScript = useProjectStore(s => s.isGeneratingScript);

  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [expandedInspirations, setExpandedInspirations] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredInspirations = selectedCategory === 'all'
    ? inspirations
    : inspirations.filter(item => (item as any).category === selectedCategory);

  const toggleExpanded = (id: string) => {
    setExpandedInspirations(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatScore = (score?: number) => {
    if (!score) return '';
    if (score >= 10000) return `${(score / 1000).toFixed(1)}K`;
    if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
    return score.toString();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 创作模式切换 */}
      <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-4">创作模式</h3>
        <div className="grid grid-cols-3 gap-3">
          {CREATIVE_MODES.map(mode => (
            <button
              key={mode.value}
              onClick={() => setCreativeMode(mode.value)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                creativeMode === mode.value
                  ? 'bg-orange-600/20 border-orange-500/50 shadow-lg shadow-orange-500/5'
                  : 'bg-neutral-950/50 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className={`text-lg font-bold mb-1 ${creativeMode === mode.value ? 'text-orange-300' : 'text-neutral-400'}`}>
                {mode.label}
              </div>
              <div className="text-xs text-neutral-500">{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 灵感库 + 手动输入区 */}
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：精选爆款文案 */}
        <div className="col-span-7 bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-neutral-300 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" /> 怪诞奇观 / 反差段子库
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-300 focus:outline-none focus:border-orange-500"
              >
                {CATEGORY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.emoji} {o.label}</option>
                ))}
              </select>
              <button
                onClick={() => handleFetchRedditJokes('curated')}
                disabled={isFetchingReddit}
                className="px-4 py-1.5 bg-orange-600/20 text-orange-400 border border-orange-500/30 rounded-lg text-sm font-bold hover:bg-orange-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isFetchingReddit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {isFetchingReddit ? '加载中...' : '加载文案'}
              </button>
            </div>
          </div>

          {/* 文案列表 */}
          <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {filteredInspirations.length === 0 ? (
              <div className="text-center py-12 text-neutral-600">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">点击「加载文案」获取高共鸣治愈系素材</p>
                <p className="text-xs text-neutral-700 mt-1">深度拆解爆款逻辑，自带情绪铺垫与金句升华</p>
              </div>
            ) : (
              filteredInspirations.map(item => (
                <div
                  key={item.id}
                  className="bg-neutral-950/60 border border-neutral-800/60 rounded-xl p-4 hover:border-neutral-700 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {item.score && (
                          <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full shrink-0">
                            🔥 {formatScore(item.score)}
                          </span>
                        )}
                        <span className="text-xs text-neutral-600 bg-neutral-800/50 px-2 py-0.5 rounded-full shrink-0">
                          {(item as any).category || (item.source === 'manual' ? '手动' : '精选')}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleExpanded(item.id)}
                        className="text-left w-full cursor-pointer"
                      >
                        <p className="text-sm font-bold text-neutral-300 leading-snug">
                          {item.title}
                        </p>
                      </button>
                      {expandedInspirations.has(item.id) && (
                        <p className="text-xs text-neutral-500 mt-2 leading-relaxed whitespace-pre-wrap">
                          {item.content}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          handleSelectInspiration(item);
                        }}
                        className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-600/30 transition-all cursor-pointer"
                        title="采纳此段子作为灵感素材"
                      >
                        采纳
                      </button>
                      <button
                        onClick={() => handleRemoveInspiration(item.id)}
                        className="p-1.5 text-neutral-600 hover:text-red-400 transition-colors cursor-pointer"
                        title="移除"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧：手动粘贴 / 采纳预览 */}
        <div className="col-span-5 flex flex-col gap-4">
          {/* 当前采纳的灵感 / 创作输入 */}
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-6 flex-1">
            <h3 className="text-lg font-bold text-neutral-300 flex items-center gap-2 mb-4">
              <PenTool className="w-5 h-5 text-blue-400" /> 创作输入
            </h3>
            <textarea
              className="w-full bg-black/60 border border-neutral-800 rounded-xl p-4 text-white placeholder-neutral-700/50 focus:outline-none focus:border-orange-500 transition-all text-sm leading-relaxed shadow-inner resize-none"
              rows={8}
              placeholder={'从左边的灵感库采纳文案，或直接在这里输入创作方向...\n\n例: "写一个关于深夜下班后给自己煮一碗面的治愈短剧"'}
              value={theme}
              onChange={e => setTheme(e.target.value)}
            />
            <div className="mt-3">
              <textarea
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl p-3 text-neutral-400 placeholder-neutral-700/50 focus:outline-none focus:border-blue-500 transition-all text-xs leading-relaxed resize-none"
                rows={3}
                placeholder="补充创意方向（可选）：如角色偏好、结尾要求、特定梗..."
                value={userDirection}
                onChange={e => setUserDirection(e.target.value)}
              />
            </div>
          </div>

          {/* 手动添加灵感 */}
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-4">
            <button
              onClick={() => setShowManualInput(!showManualInput)}
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer w-full"
            >
              <Clipboard className="w-4 h-4" />
              手动粘贴段子到灵感池
              {showManualInput ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
            </button>
            {showManualInput && (
              <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <input
                  type="text"
                  className="w-full bg-black/50 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-700 focus:outline-none focus:border-blue-500"
                  placeholder="段子标题/梗概"
                  value={manualTitle}
                  onChange={e => setManualTitle(e.target.value)}
                />
                <textarea
                  className="w-full bg-black/50 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-300 placeholder-neutral-700 focus:outline-none focus:border-blue-500 resize-none"
                  rows={4}
                  placeholder="段子正文..."
                  value={manualContent}
                  onChange={e => setManualContent(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (manualTitle.trim() && manualContent.trim()) {
                      handleAddManualInspiration(manualTitle.trim(), manualContent.trim());
                      setManualTitle('');
                      setManualContent('');
                      setShowManualInput(false);
                    }
                  }}
                  className="w-full py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-bold hover:bg-blue-600/30 transition-all cursor-pointer"
                >
                  添加到灵感池
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <button
        onClick={handleGenerateScript}
        disabled={isGeneratingScript || isFetchingReddit || !theme.trim()}
        className="w-full py-4 bg-gradient-to-r from-orange-600/30 to-amber-600/30 text-orange-300 border border-orange-500/30 rounded-xl font-bold text-lg flex justify-center items-center gap-3 hover:from-orange-600/40 hover:to-amber-600/40 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/5"
      >
        {isGeneratingScript ? (
          <><RefreshCw className="w-5 h-5 animate-spin" /> AI 疯狂赶稿中...</>
        ) : (
          <><Zap className="w-5 h-5" /> 基于灵感生成剧本初稿</>
        )}
      </button>
    </div>
  );
}
