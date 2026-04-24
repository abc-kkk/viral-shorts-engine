'use client';

import React from 'react';
import { Users, PlaySquare, Trash2, Mic, Activity, ArrowLeft, Save } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import { VOICE_OPTIONS } from '@/lib/constants';

export default function SceneSplitter() {
  const {
    characters, scriptLines,
    updateCharacter, updateScriptLine,
    addCharacter, removeCharacter,
    addScriptLine, removeScriptLine, moveScriptLine,
    setWriterStep, setCurrentPhase
  } = useProject();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {characters.length > 0 && scriptLines.length > 0 && (
        <div className="grid grid-cols-12 gap-8">
          {/* 左侧角色列表 */}
          <div className="col-span-4 flex flex-col gap-4">
            <h3 className="text-xl font-bold text-neutral-300 flex items-center gap-2 mb-2">
              <Users className="text-blue-400 w-5 h-5" /> 剧本出场人物
              <button onClick={addCharacter} className="ml-auto text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded shadow cursor-pointer">+ 添加角色</button>
            </h3>
            {characters.map((char, i) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden relative p-4 pt-6 focus-within:border-blue-500">
                <button onClick={() => removeCharacter(i)} className="absolute top-2 right-2 text-neutral-600 hover:text-red-500 bg-neutral-950 rounded bg-opacity-80 p-0.5 cursor-pointer"><Trash2 className="w-3 h-3"/></button>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className="bg-black/50 border border-neutral-800 rounded px-3 py-1.5 w-1/2 text-white font-bold text-sm focus:border-blue-500 focus:outline-none"
                    value={char.name}
                    onChange={(e) => updateCharacter(i, 'name', e.target.value)}
                  />
                  <select
                    className="bg-black/50 border border-neutral-800 rounded px-2 py-1 w-1/2 text-blue-300 font-bold text-xs focus:border-blue-500 focus:outline-none"
                    value={char.voiceName || "Zephyr"}
                    onChange={(e) => updateCharacter(i, 'voiceName', e.target.value)}
                  >
                    {VOICE_OPTIONS.map((g, idx) => (
                      <optgroup key={idx} label={g.group}>
                        {g.options.map(o => <option key={o.id} value={o.id}>🎤 {o.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  className="bg-black/50 border border-neutral-800 rounded px-3 py-1.5 w-full text-amber-300 text-xs mb-2 focus:border-amber-500 focus:outline-none"
                  placeholder="🔊 声线：如 女性，软萌奶凶的少女音"
                  value={char.voice || ''}
                  onChange={(e) => updateCharacter(i, 'voice', e.target.value)}
                />
                <textarea
                  className="bg-black/50 border border-neutral-800 rounded px-3 py-2 w-full text-neutral-300 text-xs focus:border-blue-500 focus:outline-none resize-none leading-relaxed"
                  rows={3}
                  value={char.persona}
                  onChange={(e) => updateCharacter(i, 'persona', e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* 右侧剧本 */}
          <div className="col-span-8 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-neutral-300 flex items-center gap-2">
                <PlaySquare className="text-emerald-400 w-5 h-5" /> 剧本正文与动作精修
              </h3>
              <button
                onClick={() => setWriterStep(2)}
                className="text-xs text-neutral-600 hover:text-neutral-400 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> 返回编剧评审
              </button>
            </div>
            <div className="bg-black border border-neutral-800 rounded-2xl p-2 shadow-xl flex flex-col gap-2">
              {scriptLines.map((line, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border border-transparent focus-within:border-emerald-500 hover:border-neutral-800 group relative transition-colors bg-neutral-950/50">
                  <div className="flex flex-col items-center gap-1 w-20 pt-1 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 flex justify-center items-center font-bold text-sm pb-1">
                      {i + 1}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => moveScriptLine(i, 'up')} className="text-neutral-500 hover:text-white text-xs cursor-pointer">↑</button>
                      <button onClick={() => moveScriptLine(i, 'down')} className="text-neutral-500 hover:text-white text-xs cursor-pointer">↓</button>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => removeScriptLine(i)} className="text-neutral-500 hover:text-red-500 cursor-pointer"><Trash2 className="w-3 h-3"/></button>
                      <button onClick={() => addScriptLine(i)} className="text-neutral-500 hover:text-emerald-500 text-sm font-bold cursor-pointer">+</button>
                    </div>
                    <input
                      type="text"
                      className="bg-transparent border-b border-dashed border-neutral-700 px-1 py-1 w-full text-center text-emerald-400 font-bold text-sm focus:outline-none focus:border-emerald-500"
                      value={line.speaker}
                      onChange={(e) => updateScriptLine(i, 'speaker', e.target.value)}
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-neutral-600 shrink-0" />
                      <input
                        className="flex-1 bg-transparent border-b border-neutral-800 text-sm text-neutral-400 focus:outline-none focus:border-neutral-600 px-2 py-1"
                        value={line.actionHint}
                        onChange={(e) => updateScriptLine(i, 'actionHint', e.target.value)}
                      />
                    </div>
                    <div className="flex items-start gap-2 bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                      <Mic className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                      <textarea
                        className="flex-1 bg-transparent border-none text-lg text-white font-bold leading-relaxed focus:outline-none resize-none overflow-hidden h-auto"
                        value={line.dialogue}
                        rows={Math.max(1, Math.ceil(line.dialogue.length / 30))}
                        onChange={(e) => updateScriptLine(i, 'dialogue', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-emerald-900/20 border border-emerald-500/30 p-6 rounded-xl flex items-center justify-between">
              <p className="text-emerald-400/80 text-sm">一旦确认动作及台词细调无误，即可进入定妆阶段。</p>
              <button
                onClick={() => setCurrentPhase(2)}
                className="px-6 py-3 bg-emerald-600 text-black font-bold rounded-lg shadow-lg hover:bg-emerald-500 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-5 h-5"/> 锁定剧本全文，进入定妆室！
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 如果还没有分镜数据 */}
      {(characters.length === 0 || scriptLines.length === 0) && (
        <div className="text-center py-16 text-neutral-600">
          <PlaySquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">分镜数据将在 Step 2 评审通过后自动生成</p>
          <button
            onClick={() => setWriterStep(2)}
            className="mt-4 text-sm text-orange-500 hover:text-orange-400 cursor-pointer"
          >
            ← 返回 AI 编剧
          </button>
        </div>
      )}
    </div>
  );
}
