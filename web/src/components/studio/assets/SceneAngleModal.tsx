'use client';

import React, { useState } from 'react';
import { X, Sparkles, Loader2, Camera, RotateCcw } from 'lucide-react';
import type { FsAsset, FsSceneData } from '@/lib/studio/types';
import { useStudioStore } from '@/lib/studio/store/useStudioStore';

/** 场景多角度面板的相机预设 */
const CAMERA_ANGLES = [
  { key: '正面', label: '正面', icon: '📷', desc: 'Front view, eye-level, centered' },
  { key: '左45°', label: '左45°', icon: '↖️', desc: 'Left 45-degree angle view' },
  { key: '右45°', label: '右45°', icon: '↗️', desc: 'Right 45-degree angle view' },
  { key: '左侧', label: '左侧', icon: '⬅️', desc: 'Left side profile view, 90 degrees' },
  { key: '右侧', label: '右侧', icon: '➡️', desc: 'Right side profile view, 90 degrees' },
  { key: '下俯视', label: '下俯视', icon: '⬇️', desc: 'Low angle looking down, dramatic perspective' },
  { key: '俯瞰45°', label: '俯瞰45°', icon: '🔽', desc: 'High angle looking down at 45 degrees, aerial perspective' },
  { key: '俯瞰90°', label: '俯瞰90°', icon: '🔻', desc: 'Bird\'s eye view, directly overhead, top-down 90 degrees' },
];

interface SceneAngleModalProps {
  asset: FsAsset;
  onClose: () => void;
}

export default function SceneAngleModal({ asset, onClose }: SceneAngleModalProps) {
  const { requestAssetGeneration, updateAsset, generatingAssets } = useStudioStore();
  const [generatingAngles, setGeneratingAngles] = useState<Record<string, boolean>>({});
  const [selectedAngle, setSelectedAngle] = useState<string | null>(null);

  const sceneData = asset.data as unknown as FsSceneData;
  const angles = sceneData.angles || {};
  const mainImage = asset.thumbnail;

  // 生成某个角度的场景图
  const handleGenerateAngle = async (angleKey: string) => {
    if (!mainImage) return;
    
    const angleDef = CAMERA_ANGLES.find(a => a.key === angleKey);
    if (!angleDef) return;

    setGeneratingAngles(prev => ({ ...prev, [angleKey]: true }));

    try {
      const currentScript = useStudioStore.getState().currentScript;
      
      // 1. 设置 active-context
      // charName 带角度后缀 → 防伪名唯一（如"地下车库_左45°"）
      // angleKey 存入 meta → SSE poller 知道存到 angles 里
      await fetch(`/api/studio/assets/${asset.id}/set-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: asset.scriptId,
          scriptTitle: currentScript?.title || `Script_${asset.scriptId}`,
          targetType: 'locationImage',
          charName: `${asset.name}_${angleKey}`,
          angleKey
        }),
      });

      // 2. 构造角度专用 Prompt（参考图已提供画面信息，只需指定机位）
      const prompt = `This same scene, shot from a ${angleDef.desc}. Keep everything identical, only change the camera position.`;

      // 3. 触发生成（referenceKeyword 用原始名称，angleKey 只在 meta 里传）
      await fetch('/api/generate-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: 'Nano Banana Pro',
          referenceKeyword: asset.name,
          projectId: `projects/${currentScript?.title || asset.scriptId}`,
          fireAndForget: true,
          targetType: 'locationImage',
          meta: { fsAssetId: asset.id, charName: asset.name, angleKey }
        }),
      });

      // 2秒后释放 loading（FireAndForget 模式）
      setTimeout(() => {
        setGeneratingAngles(prev => ({ ...prev, [angleKey]: false }));
      }, 2000);

    } catch (e) {
      console.error(`角度生成失败 [${angleKey}]:`, e);
      setGeneratingAngles(prev => ({ ...prev, [angleKey]: false }));
    }
  };

  // 选中查看大图
  const viewImage = selectedAngle ? angles[selectedAngle] : mainImage;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex" onClick={onClose}>
      <div className="flex w-full h-full" onClick={e => e.stopPropagation()}>
        
        {/* 左侧：大图预览区 */}
        <div className="flex-1 flex flex-col">
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/50">
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-purple-400" />
              <div>
                <h2 className="text-lg font-bold text-white">{asset.name}</h2>
                <span className="text-xs text-neutral-500">场景多角度 · {Object.keys(angles).length + (mainImage ? 1 : 0)} 张</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 大图 */}
          <div className="flex-1 flex items-center justify-center p-8">
            {viewImage ? (
              <div className="relative max-w-full max-h-full">
                <img src={viewImage} alt={selectedAngle || '主图'} className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-lg shadow-2xl" />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-neutral-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-700/50 text-sm">
                  <span className="text-purple-400 font-bold">{selectedAngle || '主图（正面）'}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-neutral-500">
                <Camera className="w-16 h-16 opacity-20" />
                <p className="text-sm">请先生成主图，再进行多角度扩展</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：角度面板 */}
        <div className="w-[380px] border-l border-neutral-800/50 flex flex-col bg-neutral-950/50">
          <div className="px-5 py-4 border-b border-neutral-800/50">
            <h3 className="text-sm font-bold text-white">场景角度</h3>
            <p className="text-[11px] text-neutral-500 mt-1">点击角度按钮生成对应视角的场景图</p>
          </div>

          {/* 角度按钮 + 缩略图网格 */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* 主图 */}
            <div className="mb-4">
              <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2">主图</div>
              <div
                onClick={() => setSelectedAngle(null)}
                className={`relative w-full h-32 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                  selectedAngle === null ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-neutral-800 hover:border-neutral-600'
                }`}
              >
                {mainImage ? (
                  <img src={mainImage} alt="主图" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                    <span className="text-neutral-600 text-xs">未生成</span>
                  </div>
                )}
              </div>
            </div>

            {/* 角度网格 */}
            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2">多角度</div>
            <div className="grid grid-cols-2 gap-2">
              {CAMERA_ANGLES.map(angle => {
                const angleImg = angles[angle.key];
                const isGen = generatingAngles[angle.key];
                const isSelected = selectedAngle === angle.key;

                return (
                  <div key={angle.key} className="flex flex-col gap-1">
                    {/* 缩略图 */}
                    <div
                      onClick={() => angleImg && setSelectedAngle(angle.key)}
                      className={`relative w-full h-24 rounded-lg overflow-hidden border-2 transition-all ${
                        isSelected ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-neutral-800'
                      } ${angleImg ? 'cursor-pointer hover:border-neutral-600' : ''}`}
                    >
                      {isGen ? (
                        <div className="w-full h-full bg-purple-500/10 flex flex-col items-center justify-center gap-1">
                          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                          <span className="text-[10px] text-purple-400">生成中</span>
                        </div>
                      ) : angleImg ? (
                        <img src={angleImg} alt={angle.label} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                          <span className="text-neutral-700 text-lg">{angle.icon}</span>
                        </div>
                      )}
                    </div>
                    {/* 标签 + 生成按钮 */}
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[11px] text-neutral-400 font-medium">{angle.label}</span>
                      {mainImage && (
                        <button
                          onClick={() => handleGenerateAngle(angle.key)}
                          disabled={isGen || !mainImage}
                          className="p-0.5 text-neutral-500 hover:text-purple-400 disabled:opacity-30 transition-colors"
                          title={angleImg ? '重新生成' : '生成此角度'}
                        >
                          {angleImg ? <RotateCcw className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
