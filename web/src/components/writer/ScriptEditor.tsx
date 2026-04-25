'use client';

import React from 'react';
import { BookOpen, ArrowLeft, RefreshCw, Trash2, PenTool, Sparkles, Activity, ArrowRight } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import { useProjectStore } from '@/lib/store/useProjectStore';

export default function ScriptEditor() {
  const {
    handleGenerateScript, handleIterateScript, handleReviewScript, handleScriptToScenes,
  } = useProject();

  const scriptIteration = useProjectStore(s => s.scriptIteration);
  const rawScript = useProjectStore(s => s.rawScript);
  const setRawScript = useProjectStore(s => s.setRawScript);
  const userDirection = useProjectStore(s => s.userDirection);
  const setUserDirection = useProjectStore(s => s.setUserDirection);
  const scriptReview = useProjectStore(s => s.scriptReview);
  const isGeneratingScript = useProjectStore(s => s.isGeneratingScript);
  const isIteratingScript = useProjectStore(s => s.isIteratingScript);
  const isReviewingScript = useProjectStore(s => s.isReviewingScript);
  const isSplittingScript = useProjectStore(s => s.isSplittingScript);
  const setWriterStep = useProjectStore(s => s.setWriterStep);

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-400';
    if (score >= 6) return 'text-yellow-400';
    if (score >= 4) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 8) return 'bg-emerald-500';
    if (score >= 6) return 'bg-yellow-500';
    if (score >= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：剧本正文 */}
        <div className="col-span-7 bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-neutral-300 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-400" /> 剧本初稿
              {scriptIteration > 0 && (
                <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">
                  第 {scriptIteration} 轮
                </span>
              )}
            </h3>
            <button
              onClick={() => setWriterStep(1)}
              className="text-xs text-neutral-600 hover:text-neutral-400 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" /> 返回灵感库
            </button>
          </div>

          {/* 可编辑的剧本文本 */}
          <textarea
            className="w-full bg-black/40 border border-neutral-800 rounded-xl p-5 text-white text-base leading-[1.9] focus:outline-none focus:border-violet-500 transition-all resize-none shadow-inner font-serif"
            rows={14}
            value={rawScript}
            onChange={e => setRawScript(e.target.value)}
            placeholder="剧本将在这里显示..."
          />

          <div className="mt-4">
            <textarea
              className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl p-3 text-neutral-400 placeholder-neutral-700/50 focus:outline-none focus:border-blue-500 transition-all text-sm leading-relaxed resize-none shadow-inner"
              rows={2}
              placeholder="觉得哪里不好？直接在这里告诉 AI（例如：把结局改得更感人一点，或者把咖啡换成奶茶...）"
              value={userDirection}
              onChange={e => setUserDirection(e.target.value)}
            />
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleGenerateScript}
              disabled={isGeneratingScript || isIteratingScript}
              className="px-4 py-3 bg-neutral-800/50 text-neutral-400 border border-neutral-700 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-neutral-800 hover:text-neutral-300 transition-all cursor-pointer disabled:opacity-40"
              title="推翻当前剧本，从头重新生成"
            >
              {isGeneratingScript ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              推翻
            </button>
            <button
              onClick={handleIterateScript}
              disabled={isGeneratingScript || isIteratingScript || !rawScript.trim()}
              className="flex-1 py-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-blue-600/30 transition-all cursor-pointer disabled:opacity-40"
              title="保留核心结构，仅根据指令和反馈进行重写修改"
            >
              {isIteratingScript ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
              AI 修改
            </button>
            <button
              onClick={handleReviewScript}
              disabled={isReviewingScript || !rawScript.trim()}
              className="flex-1 py-3 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-amber-600/30 transition-all cursor-pointer disabled:opacity-40"
            >
              {isReviewingScript ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isReviewingScript ? '评审中...' : '提交评审'}
            </button>
          </div>
        </div>

        {/* 右侧：AI 评审评分卡 */}
        <div className="col-span-5 flex flex-col gap-4">
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-neutral-300 flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-cyan-400" /> 毒舌评审
            </h3>

            {!scriptReview ? (
              <div className="text-center py-12 text-neutral-600">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">点击「提交评审」让 AI 打分</p>
                <p className="text-xs text-neutral-700 mt-1">5 维度严格评估剧本质量</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 总分 */}
                <div className={`text-center p-4 rounded-xl border ${
                  scriptReview.verdict === 'pass'
                    ? 'bg-emerald-900/20 border-emerald-500/30'
                    : 'bg-red-900/20 border-red-500/30'
                }`}>
                  <div className={`text-4xl font-black ${
                    scriptReview.verdict === 'pass' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {scriptReview.totalScore}<span className="text-lg text-neutral-500">/50</span>
                  </div>
                  <div className={`text-sm font-bold mt-1 ${
                    scriptReview.verdict === 'pass' ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {scriptReview.verdict === 'pass' ? '✅ 通过！可以拆分镜' : '❌ 需要修改'}
                  </div>
                  <div className="text-xs text-neutral-600 mt-1">
                    第 {scriptReview.iteration} 轮评审
                  </div>
                </div>

                {/* 5 维度评分 */}
                <div className="space-y-3">
                  {[
                    { key: 'hook', label: '🎣 黄金三秒', value: scriptReview.hook },
                    { key: 'twist', label: '🔄 反转力度', value: scriptReview.twist },
                    { key: 'pacing', label: '⚡ 节奏紧凑', value: scriptReview.pacing },
                    { key: 'character', label: '🎭 角色鲜明', value: scriptReview.character },
                    { key: 'retention', label: '📱 完播预测', value: scriptReview.retention },
                  ].map(d => (
                    <div key={d.key} className="flex items-center gap-3">
                      <span className="text-xs text-neutral-400 w-20 shrink-0">{d.label}</span>
                      <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${getScoreBarColor(d.value)}`}
                          style={{ width: `${d.value * 10}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold w-6 text-right ${getScoreColor(d.value)}`}>
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 修改建议 */}
                {scriptReview.feedback && (
                  <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4">
                    <p className="text-xs font-bold text-neutral-500 mb-2">📝 修改建议</p>
                    <p className="text-sm text-neutral-400 leading-relaxed">{scriptReview.feedback}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 评审完成后的操作 */}
          {scriptReview && (
            <button
              onClick={handleScriptToScenes}
              disabled={isSplittingScript}
              className={`py-4 border rounded-xl font-bold text-lg flex justify-center items-center gap-3 transition-all cursor-pointer disabled:opacity-40 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500 ${
                scriptReview.verdict === 'pass'
                  ? 'bg-gradient-to-r from-emerald-600/30 to-cyan-600/30 text-emerald-300 border-emerald-500/30 hover:from-emerald-600/40 hover:to-cyan-600/40 shadow-emerald-500/5'
                  : 'bg-neutral-800/50 text-neutral-400 border-neutral-700 hover:bg-neutral-700/50'
              }`}
            >
              {isSplittingScript ? (
                <><RefreshCw className="w-5 h-5 animate-spin" /> 拆分镜头中...</>
              ) : scriptReview.verdict === 'pass' ? (
                <><ArrowRight className="w-5 h-5" /> 评审通过！进入下一步：拆解分镜</>
              ) : (
                <>⚠️ 无视毒舌总监，强行采纳当前剧本并进入下一步</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
