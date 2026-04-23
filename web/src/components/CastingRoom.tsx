'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, RotateCcw, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import { VOICE_OPTIONS } from '@/lib/constants';

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

interface LayoutPreset {
  id: string;
  name: string;
  objects: any[];
  image: string;
  createdAt: string;
  updatedAt: string;
}

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
  // 布局预设（从 API 加载，持久化在项目文件夹）
  // ========================================
  const [layoutPresets, setLayoutPresets] = useState<LayoutPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<LayoutPreset | null>(null);
  const [layoutExpanded, setLayoutExpanded] = useState(false);
  const [loadingPresets, setLoadingPresets] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }, []);

  const fetchPresets = useCallback(async () => {
    setLoadingPresets(true);
    try {
      const res = await fetch('/api/layouts');
      const data = await res.json();
      if (data.success) setLayoutPresets(data.presets || []);
    } catch { /* ignore */ }
    finally { setLoadingPresets(false); }
  }, []);

  useEffect(() => {
    fetchPresets();
    // 检查 URL 参数是否有刚保存的预设 ID
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const newPresetId = params.get('layoutPresetId');
      if (newPresetId) {
        // 清除 URL 参数
        const url = new URL(window.location.href);
        url.searchParams.delete('layoutPresetId');
        window.history.replaceState({}, '', url.toString());
        // 加载该预设
        fetch('/api/layouts').then(r => r.json()).then(data => {
          if (data.success) {
            const preset = data.presets?.find((p: any) => p.id === newPresetId);
            if (preset) setSelectedPreset(preset);
            setLayoutPresets(data.presets || []);
          }
        }).catch(() => {});
      }
    }
  }, []);

  const handleDeletePreset = async (presetId: string) => {
    if (!confirm('确定删除这个布局预设？')) return;
    await fetch(`/api/layouts?id=${encodeURIComponent(presetId)}`, { method: 'DELETE' });
    if (selectedPreset?.id === presetId) setSelectedPreset(null);
    fetchPresets();
  };

  // 当前项目的 studio URL（用于从编辑器返回）
  const studioReturnUrl = projectId ? `/studio/${encodeURIComponent(projectId)}` : '/';

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

  // ========================================
  // 布局预设 → Flow 资产标签（唯一英文名，用于 {@xxx} 引用）
  // ========================================
  const getFlowTag = (preset: LayoutPreset) => {
    const numPart = preset.id.replace('layout_', '');
    return `Layout_${numPart.slice(-6)}`;
  };

  const copyFlowTag = (preset: LayoutPreset) => {
    const tag = getFlowTag(preset);
    navigator.clipboard.writeText(tag);
    showToast(`✅ 已复制 Flow 资产名：${tag}`);
  };

  // ========================================
  // 场景生成（带布局参考图描述注入）
  // ========================================
  const handleGenerateLocationWithLayout = () => {
    let compositionHint = '';
    if (selectedPreset) {
      const flowTag = getFlowTag(selectedPreset);
      try {
        const furniture = selectedPreset.objects.filter((o: any) => o.type !== 'character');
        const chars = selectedPreset.objects.filter((o: any) => o.type === 'character');
        const parts: string[] = [];
        parts.push(`【存在布局参考图】用户已在3D编辑器中设计了精确的空间布局，Flow资产名称为 ${flowTag}`);
        if (furniture.length > 0) {
          parts.push(`场景内包含以下物品：${furniture.map((f: any) => f.label || f.type).join('、')}`);
        }
        if (chars.length > 0) {
          parts.push(`预留${chars.length}个人物站位空间（但不要画任何人物）`);
        }
        parts.push(`请在输出prompt开头加上{@${flowTag}}标记，让系统自动将布局截图作为图生图参考`);
        compositionHint = parts.join('；');
      } catch { /* ignore */ }
    }
    handleGenerateLocationPrompt(compositionHint || undefined);
  };

  // 从提示词中提取 {@xxx} 引用关键词
  const extractRefKeywords = (prompt: string): string[] => {
    const matches = prompt.matchAll(/\{@([^{}]+)\}/g);
    return Array.from(matches, m => m[1]);
  };

  // 包装 generateLocationImage，自动提取 {@xxx} 传入 referenceKeywords
  const handleGenerateLocationImage = () => {
    const keywords = locationPrompt ? extractRefKeywords(locationPrompt) : [];
    generateLocationImage(keywords.length > 0 ? keywords : undefined);
  };

  return (
    <div className="col-span-3 flex flex-col gap-4">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold text-neutral-300 flex items-center gap-2">
                <Users className="text-blue-400 w-5 h-5" /> 角色精修定妆室
            </h3>
            {currentPhase === 3 && (
                <button 
                    onClick={() => setCurrentPhase(2)}
                    className="text-xs bg-blue-900/40 hover:bg-blue-600/60 text-blue-300 px-3 py-1.5 rounded-md border border-blue-800/50 transition-colors flex items-center gap-1"
                >
                    <RotateCcw className="w-3 h-3"/> 解锁重新定妆
                </button>
            )}
        </div>

        {/* ======== 场景定妆区 ======== */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${currentPhase === 2 ? 'bg-neutral-900 border-purple-900/40 shadow-lg shadow-purple-900/10' : 'bg-neutral-950 border-neutral-800 opacity-60 pointer-events-none'}`}>
            <div className="flex justify-between items-center">
                <div className="font-bold text-lg text-purple-300">全局场景 (Location)</div>
                <span className="text-xs text-neutral-500">所有分镜的固定背景参考</span>
            </div>
            
            {currentPhase === 2 && (
                <div className="flex flex-col gap-3">
                    {/* ======== 布局预设面板 ======== */}
                    <div className="rounded-lg border border-neutral-800 overflow-hidden">
                        <button type="button" className="w-full flex items-center justify-between px-3 py-2 bg-neutral-800/30 hover:bg-neutral-800/60 transition-colors" onClick={() => setLayoutExpanded(!layoutExpanded)}>
                            <div className="flex items-center gap-2">
                                {layoutExpanded ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400"/> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400"/>}
                                <span className="text-xs font-bold text-neutral-300">📐 布局参考图（3D 构图预设库）</span>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedPreset ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-neutral-700/30 text-neutral-500 border border-neutral-700'}`}>
                                {selectedPreset ? `✅ ${selectedPreset.name}` : `${layoutPresets.length} 个预设`}
                            </span>
                        </button>

                        {layoutExpanded && (
                            <div className="px-3 py-3 border-t border-neutral-800 space-y-3">
                                {/* 当前选中的预设预览 */}
                                {selectedPreset && (
                                    <div className="space-y-2">
                                        <div className="text-[10px] text-indigo-400 font-bold">当前选中：{selectedPreset.name}</div>
                                        <img src={selectedPreset.image} alt={selectedPreset.name} className="w-full h-32 object-cover rounded-lg border border-indigo-500/30 bg-black/50" />
                                        {/* Flow 资产标签 + 复制按钮 */}
                                        <div className="flex items-center gap-2 bg-black/40 rounded-md px-2.5 py-1.5 border border-neutral-800">
                                            <span className="text-[10px] text-neutral-500">Flow 资产名：</span>
                                            <code className="text-[11px] text-amber-400 font-mono font-bold">{getFlowTag(selectedPreset)}</code>
                                            <button onClick={() => copyFlowTag(selectedPreset)} className="ml-auto text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors font-bold">📋 复制</button>
                                        </div>
                                        <div className="text-[9px] text-neutral-600 leading-tight">💡 请在 Flow 资产库中上传布局截图时，用上面的英文名命名。生图时系统会自动通过 {'{@}'} 引用该参考图。</div>
                                        <div className="flex gap-2">
                                            <a href={`/scene-lab/editor?returnUrl=${encodeURIComponent(studioReturnUrl)}&presetId=${encodeURIComponent(selectedPreset.id)}`} className="flex-1 text-center py-1.5 rounded-md text-xs font-bold border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 no-underline">✏️ 编辑此布局</a>
                                            <button onClick={() => setSelectedPreset(null)} className="flex-1 py-1.5 rounded-md text-xs font-bold border border-neutral-600 bg-neutral-800/30 text-neutral-400 hover:bg-neutral-700/40">取消选择</button>
                                        </div>
                                    </div>
                                )}

                                {/* 预设缩略图列表 */}
                                {layoutPresets.length > 0 && (
                                    <div>
                                        <div className="text-[10px] text-neutral-500 font-bold mb-2">已保存的布局预设（点击选用）</div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {layoutPresets.map(preset => (
                                                <div key={preset.id} className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedPreset?.id === preset.id ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-neutral-800 hover:border-neutral-600'}`} onClick={() => setSelectedPreset(preset)}>
                                                    <img src={preset.image} alt={preset.name} className="w-full h-16 object-cover bg-black/50" />
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-0.5 text-[9px] text-neutral-300 truncate">{preset.name}</div>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }} className="absolute top-0.5 right-0.5 w-4 h-4 rounded bg-red-500/80 text-white text-[8px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 创建新布局按钮 */}
                                <a href={`/scene-lab/editor?returnUrl=${encodeURIComponent(studioReturnUrl)}`} className="block w-full py-2.5 rounded-lg border-2 border-dashed border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors text-center no-underline">
                                    <div className="text-indigo-400 text-xs font-bold">+ 新建 3D 布局</div>
                                    <div className="text-neutral-600 text-[10px]">拖拽桌椅摆好构图，保存为预设</div>
                                </a>

                                {loadingPresets && <div className="text-center text-neutral-600 text-[10px]">加载中...</div>}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleGenerateLocationWithLayout}
                        disabled={isProcessingLocation === 'prompt'}
                        className={`py-1.5 px-3 rounded text-xs border transition-all disabled:opacity-50 ${selectedPreset ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20'}`}
                    >
                        {isProcessingLocation === 'prompt' ? "🔍 提取场景提示词..." : selectedPreset ? `✨ 根据「${selectedPreset.name}」生成场景 Prompt` : "✨ 提取全局场景中文 Prompt"}
                    </button>
                    <textarea
                        className="bg-black/60 border border-neutral-800 text-purple-300 text-xs p-2 rounded focus:outline-none focus:border-purple-500 font-mono"
                        rows={3}
                        value={locationPrompt || ""}
                        onChange={(e) => setLocationPrompt(e.target.value)}
                        placeholder="手工编辑中文场景描述..."
                    />
                </div>
            )}

            {locationImage ? (
                <div className="relative group">
                    <img src={locationImage} className="w-full h-32 object-cover bg-white/5 rounded-lg border border-neutral-700" alt="Location" />
                    {currentPhase === 2 && (
                        <button 
                            onClick={handleGenerateLocationImage}
                            className="absolute top-2 right-2 bg-black/80 p-2 rounded text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="重新生成图片"
                        ><RotateCcw className="w-4 h-4"/></button>
                    )}
                </div>
            ) : (
                <div className="w-full h-32 bg-black/50 rounded-lg flex items-center justify-center border border-neutral-800 border-dashed">
                    <span className="text-neutral-600 text-xs">暂无场景参考图</span>
                </div>
            )}

            {currentPhase === 2 && (
                <button 
                    onClick={handleGenerateLocationImage}
                    disabled={isProcessingLocation === 'image'}
                    className="w-full py-2 bg-purple-600 text-white font-bold text-xs rounded shadow-lg shadow-purple-900/50 hover:bg-purple-500 transition-colors disabled:opacity-50 mt-2"
                >
                    {isProcessingLocation === 'image' ? "Nano Pro 绘制中..." : "根据 Prompt 生成场景参考图"}
                </button>
            )}
        </div>

        {/* ======== 角色定妆区 ======== */}
        {characters.map((char, i) => (
            <div key={i} className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${currentPhase === 2 ? 'bg-neutral-900 border-blue-900/40 shadow-lg shadow-blue-900/10' : 'bg-neutral-950 border-neutral-800 opacity-60 pointer-events-none'}`}>
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
                                    <img src={characterImages[i]} className="w-full h-32 object-contain bg-white/5 rounded-lg border border-neutral-700" alt="Casting" />
                                    {currentPhase === 2 && (
                                        <button 
                                            onClick={() => generateCastingImage(i)}
                                            className="absolute top-2 right-2 bg-black/80 p-2 rounded text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="重新生成图片"
                                        ><RotateCcw className="w-4 h-4"/></button>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full h-32 bg-black/50 rounded-lg flex items-center justify-center border border-neutral-800 border-dashed">
                                    <span className="text-neutral-600 text-xs">暂无定妆照</span>
                                </div>
                            )}

                            {currentPhase === 2 && (
                                <button 
                                    onClick={() => generateCastingImage(i)}
                                    disabled={processingChars[i] === 'image'}
                                    className="w-full py-2 bg-blue-600 text-white font-bold text-xs rounded shadow-lg shadow-blue-900/50 hover:bg-blue-500 transition-colors disabled:opacity-50 mt-2"
                                >
                                    {processingChars[i] === 'image' ? "Nano Pro 绘制中..." : "根据 Prompt 渲染定妆照"}
                                </button>
                            )}
                        </>
                    );
                })()}
            </div>
        ))}
        
        {currentPhase === 2 && (
            <button 
                onClick={() => setCurrentPhase(3)}
                className="w-full mt-4 py-4 bg-gradient-to-r from-blue-700 to-purple-700 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2"
            >
                完成全部角色定妆，开始分镜制作 <ArrowRight className="w-4 h-4"/>
            </button>
        )}

        {/* Global Toast */}
        {toastMsg && (
            <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-neutral-800 text-white px-4 py-2 rounded-lg shadow-2xl border border-neutral-700 z-[100] text-sm animate-in fade-in slide-in-from-bottom-5">
                {toastMsg}
            </div>
        )}
    </div>
  );
}
