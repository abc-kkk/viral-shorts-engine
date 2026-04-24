'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, RotateCcw, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import { VOICE_OPTIONS } from '@/lib/constants';
import LocationPanel from './LocationPanel';

// ========================================
// 角色设定图内容选项（借鉴 Moyin Creator 的 SHEET_ELEMENTS）
// ========================================
const SHEET_ELEMENTS = [
  { id: 'single', label: '🎯 单人全身照', desc: '经典纯净定妆照（正面、居中、白底）', promptText: '单人全身照（经典模式）', default: true },
  { id: 'three-view', label: '📐 三视图', desc: '正面、侧面、背面三视角转身参考', promptText: '三视图（正面全身站姿、右侧面轮廓站姿、背面站姿，三个视角的服装和发型保持完全一致）', default: false },
  { id: 'expressions', label: '😀 表情设定集', desc: '喜怒哀乐多种面部表情', promptText: '表情设定集（开心微笑、愤怒皱眉、惊讶张嘴、悲伤低眉、冷漠面无表情，五种面部特写排列）', default: false },
  { id: 'proportions', label: '📏 比例设定', desc: '身体比例、头身比参考', promptText: '比例设定（身体比例参考图、头身比标注、全身站立参考线）', default: false },
  { id: 'poses', label: '🏃 动作设定', desc: '站坐跑跳等各种常见姿势', promptText: '动作设定集（站立、坐姿、跑步、跳跃等多种常见动作姿势排列）', default: false },
] as const;

type SheetElementId = typeof SHEET_ELEMENTS[number]['id'];

export default function CastingRoom() {
  const {
    currentPhase, setCurrentPhase,
    characters, updateCharacter,
    characterPrompts, setCharacterPrompts,
    characterImages,
    processingChars,
    handleGenerateCharacterPrompt, generateCastingImage,
    locationPrompt, setLocationPrompt,
    locationImage,
    isProcessingLocation,
    handleGenerateLocationPrompt, generateLocationImage,
    projectId,
  } = useProject();

  // 每个角色独立的设定图选项状态
  const [charSheetElements, setCharSheetElements] = useState<Record<number, SheetElementId[]>>({});
  const [sheetExpanded, setSheetExpanded] = useState<Record<number, boolean>>({});

  // ========================================
  // 角色设定图逻辑
  // ========================================
  const getSelectedElements = (index: number): SheetElementId[] => {
    return charSheetElements[index] || SHEET_ELEMENTS.filter(e => e.default).map(e => e.id);
  };

  const toggleElement = (charIndex: number, elementId: SheetElementId) => {
    setCharSheetElements(prev => {
      const current = prev[charIndex] || SHEET_ELEMENTS.filter(e => e.default).map(e => e.id);
      if (elementId === 'single') return { ...prev, [charIndex]: ['single'] };
      let next: SheetElementId[];
      if (current.includes(elementId)) {
        next = current.filter(id => id !== elementId);
        if (next.length === 0 || (next.length === 1 && next[0] === 'single')) next = ['single'];
      } else {
        next = [...current.filter(id => id !== 'single'), elementId];
      }
      return { ...prev, [charIndex]: next };
    });
  };

  const buildSheetElementsText = (charIndex: number): string => {
    const selected = getSelectedElements(charIndex);
    if (selected.length === 1 && selected[0] === 'single') return '';
    return selected.map(id => SHEET_ELEMENTS.find(e => e.id === id)?.promptText).filter(Boolean).join('；');
  };

  const handleGenerateWithSheet = (index: number) => {
    handleGenerateCharacterPrompt(index, buildSheetElementsText(index) || undefined);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-[1800px] mx-auto animate-in slide-in-from-right-8 duration-500 pb-20">
        <div className="flex justify-between items-end">
            <div>
                <h2 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-3">
                    <Users className="text-blue-400 w-8 h-8" /> 角色精修定妆室
                </h2>
                <p className="text-neutral-400">完善全局场景参考图，并为每一个出场角色设定统一的形象与声线。</p>
            </div>
        </div>

        {/* ======== 场景定妆区 ======== */}
        <div className="w-full xl:w-2/3">
            <LocationPanel
                title="全局场景 (Location)"
                description="所有分镜的固定背景参考"
                prompt={locationPrompt}
                onPromptChange={setLocationPrompt}
                image={locationImage}
                isProcessingPrompt={isProcessingLocation === 'prompt'}
                isProcessingImage={isProcessingLocation === 'image'}
                onGeneratePrompt={handleGenerateLocationPrompt}
                onGenerateImage={generateLocationImage}
                projectId={projectId}
                isCollapsible={false}
            />
        </div>

        {/* ======== 角色定妆区 ======== */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
        {characters.map((char, i) => (
            <div key={i} className="p-6 rounded-2xl border transition-all flex flex-col gap-4 bg-neutral-900 border-blue-900/40 shadow-xl shadow-blue-900/10">
                <div className="flex justify-between items-center">
                    <div className="font-bold text-lg text-white">{char.name}</div>
                    <select 
                        className={`bg-black/50 border border-neutral-800 rounded px-2 py-1 w-auto text-blue-300 font-bold text-xs focus:border-blue-500 focus:outline-none pointer-events-auto`}
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
                
                {(() => {
                    const isSpecialRole = char.name === '字卡' || char.name === '旁白';
                    if (isSpecialRole) {
                        return (
                            <div className="w-full mt-2 h-16 bg-black/30 rounded flex items-center justify-center border border-neutral-800 border-dashed">
                                <span className="text-neutral-500 text-xs text-center">系统专属不可见角色<br/>无需定妆照，只需配置声音属性（如有旁白）</span>
                            </div>
                        );
                    }
                    const selected = getSelectedElements(i);
                    const isAdvancedMode = !(selected.length === 1 && selected[0] === 'single');
                    const isExpanded = sheetExpanded[i] ?? false;

                    return (
                        <>
                            {currentPhase === 2 && (
                                <div className="flex flex-col gap-2">
                                    {/* ======== 设定图内容选项（Moyin 风格） ======== */}
                                    <div className="rounded-lg border border-neutral-800 overflow-hidden">
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between px-3 py-2 bg-neutral-800/30 hover:bg-neutral-800/60 transition-colors"
                                            onClick={() => setSheetExpanded(prev => ({ ...prev, [i]: !isExpanded }))}
                                        >
                                            <div className="flex items-center gap-2">
                                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400"/> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400"/>}
                                                <span className="text-xs font-bold text-neutral-300">🎨 设定图内容</span>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isAdvancedMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                                {isAdvancedMode ? `🔥 高级 · ${selected.length}项` : '📷 经典单人照'}
                                            </span>
                                        </button>

                                        {isExpanded && (
                                            <div className="px-3 py-2 space-y-1.5 border-t border-neutral-800">
                                                {SHEET_ELEMENTS.map((element) => {
                                                    const isSelected = selected.includes(element.id);
                                                    return (
                                                        <div
                                                            key={element.id}
                                                            className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all border ${
                                                                isSelected 
                                                                    ? element.id === 'single' 
                                                                        ? 'border-blue-500/40 bg-blue-500/10' 
                                                                        : 'border-amber-500/40 bg-amber-500/10' 
                                                                    : 'border-transparent hover:border-neutral-700 hover:bg-neutral-800/30'
                                                            }`}
                                                            onClick={() => toggleElement(i, element.id)}
                                                        >
                                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                                                isSelected 
                                                                    ? element.id === 'single'
                                                                        ? 'border-blue-500 bg-blue-500'
                                                                        : 'border-amber-500 bg-amber-500'
                                                                    : 'border-neutral-600'
                                                            }`}>
                                                                {isSelected && (
                                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-bold text-neutral-200">{element.label}</div>
                                                                <div className="text-[10px] text-neutral-500 leading-tight">{element.desc}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div className="text-[10px] text-neutral-600 pt-1 border-t border-neutral-800/50">
                                                    💡 选择多项时将生成专业 Character Design Sheet（角色设定参考单）
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        onClick={() => handleGenerateWithSheet(i)}
                                        disabled={processingChars[i] === 'prompt'}
                                        className={`py-1.5 px-3 rounded text-xs border transition-all disabled:opacity-50 ${
                                            isAdvancedMode
                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                                : 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
                                        }`}
                                    >
                                        {processingChars[i] === 'prompt' 
                                            ? "🔍 AI 正在纵观全剧提取人设..." 
                                            : isAdvancedMode
                                                ? `✨ 生成角色设定参考单（${selected.length}项内容）`
                                                : "✨ 提取角色外表中文 Prompt"
                                        }
                                    </button>
                                    <textarea
                                        className="bg-black/60 border border-neutral-800 text-blue-300 text-xs p-2 rounded focus:outline-none focus:border-blue-500 font-mono"
                                        rows={4}
                                        value={characterPrompts[i] || ""}
                                        onChange={(e) => setCharacterPrompts(prev => ({...prev, [i]: e.target.value}))}
                                        placeholder="手工编辑中文咒语..."
                                    />
                                </div>
                            )}

                            {characterImages[i] ? (
                                <div className="relative group">
                                    <img src={characterImages[i]} className="w-full h-48 object-contain bg-black/50 rounded-lg border border-neutral-700" alt="Casting" />
                                    <button 
                                        onClick={() => generateCastingImage(i)}
                                        className="absolute top-2 right-2 bg-black/80 p-2 rounded text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="重新生成图片"
                                    ><RotateCcw className="w-4 h-4"/></button>
                                </div>
                            ) : (
                                <div className="w-full h-48 bg-black/50 rounded-lg flex items-center justify-center border border-neutral-800 border-dashed">
                                    <span className="text-neutral-600 text-sm">暂无定妆照</span>
                                </div>
                            )}

                            <button 
                                    onClick={() => generateCastingImage(i)}
                                    disabled={processingChars[i] === 'image'}
                                    className="w-full py-2 bg-blue-600 text-white font-bold text-xs rounded shadow-lg shadow-blue-900/50 hover:bg-blue-500 transition-colors disabled:opacity-50 mt-2"
                                >
                                    {processingChars[i] === 'image' ? "Nano Pro 绘制中..." : "根据 Prompt 渲染定妆照"}
                                </button>
                        </>
                    );
                })()}
            </div>
        ))}
        </div>
        
        <button 
                onClick={() => setCurrentPhase(3)}
                className="w-full mt-4 py-4 bg-gradient-to-r from-blue-700 to-purple-700 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2"
            >
                完成全部角色定妆，开始分镜制作 <ArrowRight className="w-4 h-4"/>
            </button>

        {/* Global Toast */}
    </div>
  );
}
