'use client';

import React from 'react';
import { Users, MapPin, Package, Edit3, Trash2, Sparkles, UserCircle, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FsAsset, FsAssetType } from '@/lib/studio/types';
import { useStudioStore } from '@/lib/studio/store/useStudioStore';

const TYPE_CONFIG: Record<FsAssetType, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  character: { icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', label: '角色' },
  scene: { icon: MapPin, color: 'text-purple-400', bg: 'bg-purple-500/10', label: '场景' },
  prop: { icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: '道具' },
};

interface AssetCardProps {
  asset: FsAsset;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function AssetCard({ asset, onEdit, onDelete }: AssetCardProps) {
  const config = TYPE_CONFIG[asset.type];
  const Icon = config.icon;
  const data = asset.data as unknown as Record<string, unknown>;
  const { generatingAssets, requestAssetGeneration } = useStudioStore();
  const isGenerating = generatingAssets[asset.id] || false;

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

  return (
    <div className="group bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-all">
      <div className="flex items-start gap-3">
        {/* 缩略图 or 图标 */}
        {isGenerating ? (
          <div className={`w-12 h-12 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
             <Loader2 className={`w-6 h-6 animate-spin ${config.color}`} />
          </div>
        ) : asset.thumbnail ? (
          <img src={asset.thumbnail} alt={asset.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
        ) : (
          <div className={`w-12 h-12 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
            {asset.type === 'character' ? (
              <UserCircle className={`w-7 h-7 ${config.color}`} />
            ) : (
              <Icon className={`w-6 h-6 ${config.color}`} />
            )}
          </div>
        )}

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-white text-sm truncate">{asset.name}</h4>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${config.bg} ${config.color}`}>
              {config.label}
            </span>
            {asset.source === 'ai_extracted' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> AI
              </span>
            )}
          </div>
          <p className="text-neutral-500 text-xs line-clamp-2">{getSummary()}</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {(asset.type === 'character' || asset.type === 'scene') && (
            <button 
              onClick={() => requestAssetGeneration(asset)} 
              disabled={isGenerating}
              className="p-1.5 text-neutral-500 hover:text-amber-400 hover:bg-neutral-800 rounded-lg disabled:opacity-50" 
              title="生成参考图"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
          {onEdit && (
            <button onClick={onEdit} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg" title="编辑">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg" title="删除">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 角色关系 */}
      {asset.type === 'character' && (data as any).relationships && (
        <div className="mt-2 pl-15 text-[11px] text-neutral-600">
          🔗 {(data as any).relationships}
        </div>
      )}
    </div>
  );
}
