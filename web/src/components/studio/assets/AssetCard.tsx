'use client';

import React, { useState } from 'react';
import { Users, MapPin, Package, Edit3, Trash2, Sparkles, UserCircle, Loader2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FsAsset, FsAssetType } from '@/lib/studio/types';
import { useStudioStore, getDefaultAssetPrompt } from '@/lib/studio/store/useStudioStore';

const TYPE_CONFIG: Record<FsAssetType, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  character: { icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', label: '角色' },
  scene: { icon: MapPin, color: 'text-purple-400', bg: 'bg-purple-500/10', label: '场景' },
  prop: { icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: '道具' },
};

interface AssetCardProps {
  asset: FsAsset;
  onOpenAngleModal?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function AssetCard({ asset, onOpenAngleModal, onEdit, onDelete }: AssetCardProps) {
  const config = TYPE_CONFIG[asset.type];
  const Icon = config.icon;
  const data = asset.data as unknown as Record<string, unknown>;
  const { currentScript, generatingAssets, requestAssetGeneration } = useStudioStore();
  const isGenerating = generatingAssets[asset.id] || false;
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptText, setPromptText] = useState('');

  // 点击图片：场景打开多角度面板（由父级管理），其他打开 Lightbox
  const handleImageClick = () => {
    if (asset.type === 'scene' && onOpenAngleModal) {
      onOpenAngleModal();
    } else {
      setIsPreviewOpen(true);
    }
  };

  const handleSparklesClick = () => {
    const artStyle = currentScript?.metadata?.artStyle as string | undefined;
    setPromptText(getDefaultAssetPrompt(asset, artStyle));
    setIsPromptModalOpen(true);
  };

  const handleGenerate = () => {
    setIsPromptModalOpen(false);
    requestAssetGeneration(asset, promptText);
  };

  // 提取摘要信息
  const getSummary = () => {
    switch (asset.type) {
      case 'character':
        return (data as any).appearance || (data as any).personality || asset.description || '暂无描述';
      case 'scene':
        return (data as any).atmosphere || (data as any).imagePrompt || asset.description || '暂无描述';
      case 'prop':
        return (data as any).imagePrompt || asset.description || '暂无描述';
      default:
        return asset.description || '暂无描述';
    }
  };

  // 场景的角度数量标记
  const angleCount = asset.type === 'scene' ? Object.keys((data as any).angles || {}).length : 0;

  return (
    <>
      <div className="group bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-all flex flex-col relative">
        
        {/* 顶部大图区域 */}
        <div className="relative w-full h-48 bg-neutral-950 flex items-center justify-center shrink-0 border-b border-neutral-800/50">
          {isGenerating ? (
            <div className={`w-full h-full ${config.bg} flex flex-col items-center justify-center gap-3`}>
              <Loader2 className={`w-8 h-8 animate-spin ${config.color}`} />
              <span className={`text-xs font-bold ${config.color} animate-pulse`}>AI 绘制中...</span>
            </div>
          ) : asset.thumbnail ? (
            <div className="w-full h-full relative cursor-pointer overflow-hidden group/img" onClick={handleImageClick}>
              <img src={asset.thumbnail} alt={asset.name} className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105" />
              {/* 场景角度数量角标 */}
              {asset.type === 'scene' && angleCount > 0 && (
                <div className="absolute bottom-2 right-2 bg-purple-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  📐 {angleCount} 角度
                </div>
              )}
            </div>
          ) : (
            <div className={`w-full h-full ${config.bg} flex items-center justify-center`}>
              {asset.type === 'character' ? (
                <UserCircle className={`w-16 h-16 ${config.color} opacity-20`} />
              ) : (
                <Icon className={`w-16 h-16 ${config.color} opacity-20`} />
              )}
            </div>
          )}

          {/* 角标 */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold bg-neutral-900/80 backdrop-blur-md border border-neutral-700/50 ${config.color}`}>
              {config.label}
            </span>
            {asset.source === 'ai_extracted' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/20 text-amber-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI 生成
              </span>
            )}
          </div>

          {/* 操作按钮组 */}
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/80 backdrop-blur-md p-1.5 rounded-xl border border-neutral-700/50">
            <button 
              onClick={handleSparklesClick} 
              disabled={isGenerating}
              className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded-lg disabled:opacity-50 transition-colors" 
              title={asset.thumbnail ? "重新生成图片" : "生成图片"}
            >
              <Sparkles className="w-4 h-4" />
            </button>
            {onEdit && (
              <button onClick={onEdit} className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors" title="编辑信息">
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors" title="删除资产">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 底部信息 */}
        <div className="p-4 flex-1 flex flex-col">
          <h4 className="font-bold text-white text-lg truncate mb-1.5">{asset.name}</h4>
          <p className="text-neutral-400 text-xs line-clamp-3 leading-relaxed flex-1">{getSummary()}</p>
          
          {asset.type === 'character' && (
            <div className="mt-3 pt-3 border-t border-neutral-800/50 text-xs flex items-center justify-between gap-2">
              <div className="text-neutral-500 line-clamp-1 flex-1" title={(data as any).relationships || '无关系描述'}>
                {(data as any).relationships ? `🔗 ${(data as any).relationships}` : ''}
              </div>
              <div className="flex items-center gap-1 text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full font-medium shrink-0" title="配音音色">
                🎙️ {(data as any).voiceConfig?.voiceName || 'Zephyr'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal（角色/道具） */}
      {isPreviewOpen && asset.thumbnail && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 lg:p-12" onClick={() => setIsPreviewOpen(false)}>
          <button 
            className="absolute top-6 right-6 p-3 bg-neutral-800/50 hover:bg-neutral-800 rounded-full text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setIsPreviewOpen(false); }}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={asset.thumbnail} 
            alt={asset.name} 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
          />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-neutral-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-neutral-800 text-white flex flex-col items-center gap-1 shadow-xl pointer-events-none">
            <span className="text-base font-bold">{asset.name}</span>
            <span className="text-xs text-neutral-400 font-normal">点击任意空白处关闭</span>
          </div>
        </div>
      )}

      {/* 提示词编辑 Modal */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsPromptModalOpen(false)}>
          <div 
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                生成 {config.label}图片：{asset.name}
              </h3>
              <button onClick={() => setIsPromptModalOpen(false)} className="text-neutral-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 flex-1">
              <p className="text-xs text-neutral-400 mb-3">你可以在发送给底层的生图引擎之前，对 AI 自动生成的提示词进行二次修改补充：</p>
              <textarea 
                className="w-full h-64 bg-black border border-neutral-800 rounded-xl p-4 text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50 resize-none leading-relaxed"
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
              />
            </div>
            <div className="px-5 py-4 border-t border-neutral-800 flex justify-end gap-3 bg-neutral-950">
              <button 
                onClick={() => setIsPromptModalOpen(false)}
                className="px-5 py-2 rounded-lg text-sm font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleGenerate}
                disabled={!promptText.trim()}
                className="px-6 py-2 rounded-lg text-sm font-bold bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> 确认生成
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
