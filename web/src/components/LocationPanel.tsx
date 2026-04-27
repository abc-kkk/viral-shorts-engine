'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { extractRefKeywords } from '@/lib/utils/promptParser';

interface LayoutPreset {
  id: string;
  name: string;
  objects: any[];
  image: string;
  createdAt: string;
  updatedAt: string;
}

interface LocationPanelProps {
  title: string;
  description?: string;
  prompt: string;
  onPromptChange: (p: string) => void;
  image: string;
  isProcessingPrompt: boolean;
  isProcessingImage: boolean;
  onGeneratePrompt: (compositionHint?: string) => void;
  onGenerateImage: (referenceKeywords?: string[]) => void;
  projectId: string;
  isCollapsible?: boolean;
  hideImageGeneration?: boolean;
}

export default function LocationPanel({
  title, description,
  prompt, onPromptChange,
  image,
  isProcessingPrompt, isProcessingImage,
  onGeneratePrompt, onGenerateImage,
  projectId,
  isCollapsible = false,
  hideImageGeneration = false
}: LocationPanelProps) {
  // 布局预设
  const [layoutPresets, setLayoutPresets] = useState<LayoutPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<LayoutPreset | null>(null);
  const [layoutExpanded, setLayoutExpanded] = useState(false);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(isCollapsible);

  const flowUrl = useProjectStore(s => s.flowUrl);

  const getFlowTag = (preset: LayoutPreset) => {
    const numPart = preset.id.replace('layout_', '');
    return `Layout_${numPart.slice(-6)}`;
  };

  const handleSelectPreset = useCallback((preset: LayoutPreset | null) => {
    setSelectedPreset(preset);
    if (hideImageGeneration) {
      if (preset) {
        onPromptChange(`{@${getFlowTag(preset)}}`);
      } else {
        onPromptChange('');
      }
    }
  }, [hideImageGeneration, onPromptChange]);

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
            if (preset) {
                handleSelectPreset(preset);
                setIsCollapsed(false); // 刚保存回来自动展开
            }
            setLayoutPresets(data.presets || []);
          }
        }).catch(() => {});
      }
    }
  }, [fetchPresets]);

  const handleDeletePreset = async (presetId: string) => {
    if (!confirm('确定删除这个布局预设？')) return;
    await fetch(`/api/layouts?id=${encodeURIComponent(presetId)}`, { method: 'DELETE' });
    if (selectedPreset?.id === presetId) handleSelectPreset(null);
    fetchPresets();
  };

  const studioReturnUrl = projectId ? `/studio/${encodeURIComponent(projectId)}` : '/';

  const copyFlowTag = (preset: LayoutPreset) => {
    const tag = getFlowTag(preset);
    navigator.clipboard.writeText(tag);
    showToast(`✅ 已复制 Flow 资产名：${tag}`);
  };

  const handleUploadToFlow = async (preset: LayoutPreset) => {
    copyFlowTag(preset);
    if (!flowUrl) {
      showToast('⚠️ 未设置 Flow URL，无法自动上传');
      return;
    }
    showToast('🚀 正在自动上传至 Flow，请勿操作鼠标...');
    try {
      const res = await fetch('/api/extension/upload-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            image: preset.image, 
            name: getFlowTag(preset), 
            flowUrl 
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ 自动化上传成功！');
      } else {
        showToast(`❌ 上传失败: ${data.error}`);
      }
    } catch (e: any) {
      showToast(`❌ 上传报错: ${e.message}`);
    }
  };

  const handleGeneratePromptLocal = () => {
    let compositionHint = '';
    if (selectedPreset) {
      const flowTag = getFlowTag(selectedPreset);
      try {
        const furniture = selectedPreset.objects.filter((o: any) => o.type !== 'character');
        const chars = selectedPreset.objects.filter((o: any) => o.type === 'character');
        const parts: string[] = [];
        parts.push(`【存在布局参考图】用户已在3D编辑器中设计了精确的空间布局，Flow资产名称为 ${flowTag}`);
        if (furniture.length > 0) {
          parts.push(`场景内仅包含以下核心物品：${furniture.map((f: any) => f.label || f.type).join('、')}。请绝对不要增加任何未提及的家具、摆件或环境元素，你只需要对这些已有物品的材质细节、颜色以及整体的光影氛围进行写实描写`);
        }
        if (chars.length > 0) {
          parts.push(`预留${chars.length}个人物站位空间（但不要画任何人物）`);
        }
        parts.push(`请在输出prompt开头加上{@${flowTag}}标记，让系统自动将布局截图作为图生图参考`);
        compositionHint = parts.join('；');
      } catch { /* ignore */ }
    }
    onGeneratePrompt(compositionHint || undefined);
  };


  const handleGenerateImageLocal = () => {
    const keywords = prompt ? extractRefKeywords(prompt) : [];
    onGenerateImage(keywords.length > 0 ? keywords : undefined);
  };

  return (
    <div className={`p-4 rounded-xl border transition-all flex flex-col gap-3 bg-neutral-900 border-purple-900/40 shadow-lg shadow-purple-900/10`}>
        {isCollapsible ? (
            <button 
                type="button" 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex items-center justify-between w-full hover:bg-neutral-800/50 p-1 -m-1 rounded transition-colors"
            >
                <div className="flex items-center gap-1.5">
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-purple-400"/> : <ChevronDown className="w-4 h-4 text-purple-400"/>}
                    <div className="font-bold text-sm text-purple-300">{title}</div>
                </div>
                {description && <span className="text-[10px] text-neutral-500">{description}</span>}
            </button>
        ) : (
            <div className="flex justify-between items-center">
                <div className="font-bold text-sm text-purple-300">{title}</div>
                {description && <span className="text-[10px] text-neutral-500">{description}</span>}
            </div>
        )}
        
        {!isCollapsed && (
            <div className="flex flex-col gap-3 mt-2 animate-in slide-in-from-top-2">
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
                                        <div className="ml-auto flex items-center gap-1">
                                            <button onClick={() => copyFlowTag(selectedPreset)} className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors font-bold">📋 复制</button>
                                            <button onClick={() => handleUploadToFlow(selectedPreset)} className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition-colors font-bold">🚀 全自动上传</button>
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-neutral-600 leading-tight">💡 请在 Flow 资产库中上传布局截图时，用上面的英文名命名。生图时系统会自动通过 {'{@}'} 引用该参考图。</div>
                                    <div className="flex gap-2">
                                        <a href={`/scene-lab/editor?returnUrl=${encodeURIComponent(studioReturnUrl)}&presetId=${encodeURIComponent(selectedPreset.id)}`} className="flex-1 text-center py-1.5 rounded-md text-xs font-bold border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 no-underline">✏️ 编辑此布局</a>
                                        <button onClick={() => handleSelectPreset(null)} className="flex-1 py-1.5 rounded-md text-xs font-bold border border-neutral-600 bg-neutral-800/30 text-neutral-400 hover:bg-neutral-700/40">取消选择</button>
                                    </div>
                                </div>
                            )}

                            {/* 预设缩略图列表 */}
                            {layoutPresets.length > 0 && (
                                <div>
                                    <div className="text-[10px] text-neutral-500 font-bold mb-2">已保存的布局预设（点击选用）</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {layoutPresets.map(preset => (
                                            <div key={preset.id} className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedPreset?.id === preset.id ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-neutral-800 hover:border-neutral-600'}`} onClick={() => handleSelectPreset(preset)}>
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

                {!hideImageGeneration && (
                  <>
                    <button 
                        onClick={handleGeneratePromptLocal}
                        disabled={isProcessingPrompt}
                        className={`py-1.5 px-3 rounded text-xs border transition-all disabled:opacity-50 ${selectedPreset ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20'}`}
                    >
                        {isProcessingPrompt ? "🔍 提取场景提示词..." : selectedPreset ? `✨ 根据「${selectedPreset.name}」生成场景 Prompt` : `✨ 提取${isCollapsible ? '本幕' : '全局'}场景中文 Prompt`}
                    </button>
                    <textarea
                        className="bg-black/60 border border-neutral-800 text-purple-300 text-xs p-2 rounded focus:outline-none focus:border-purple-500 font-mono"
                        rows={3}
                        value={prompt || ""}
                        onChange={(e) => onPromptChange(e.target.value)}
                        placeholder="手工编辑中文场景描述..."
                    />

                    {image ? (
                        <div className="relative group">
                            <img src={image} className="w-full h-32 object-cover bg-white/5 rounded-lg border border-neutral-700" alt="Location" />
                            <button 
                                onClick={handleGenerateImageLocal}
                                className="absolute top-2 right-2 bg-black/80 p-2 rounded text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="重新生成图片"
                            ><RotateCcw className="w-4 h-4"/></button>
                        </div>
                    ) : (
                        <div className="w-full h-32 bg-black/50 rounded-lg flex items-center justify-center border border-neutral-800 border-dashed">
                            <span className="text-neutral-600 text-xs">暂无场景参考图</span>
                        </div>
                    )}

                    <button 
                        onClick={handleGenerateImageLocal}
                        disabled={isProcessingImage}
                        className="w-full py-2 bg-purple-600 text-white font-bold text-xs rounded shadow-lg shadow-purple-900/50 hover:bg-purple-500 transition-colors disabled:opacity-50 mt-2"
                    >
                        {isProcessingImage ? "Nano Pro 绘制中..." : "根据 Prompt 生成场景参考图"}
                    </button>
                  </>
                )}
            </div>
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
