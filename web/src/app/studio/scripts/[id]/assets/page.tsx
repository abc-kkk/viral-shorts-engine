'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, MapPin, Package, Sparkles, Loader2, Plus, Trash2, Edit3, Save, X, Wand2, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStudioStore, getDefaultAssetPrompt } from '@/lib/studio/store/useStudioStore';
import type { FsAsset, FsAssetType } from '@/lib/studio/types';
import AssetCard from '@/components/studio/assets/AssetCard';
import SceneAngleModal from '@/components/studio/assets/SceneAngleModal';
import { useStudioInboxPoller } from '@/components/studio/assets/useStudioInboxPoller';
import { VOICE_OPTIONS } from '@/lib/constants';

const TYPE_TABS: { key: FsAssetType; label: string; icon: LucideIcon; color: string; bg: string }[] = [
  { key: 'character', label: '角色', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'scene', label: '场景', icon: MapPin, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'prop', label: '道具', icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
];

export default function AssetManagePage() {
  const params = useParams();
  const router = useRouter();
  const scriptId = params.id as string;

  const {
    currentScript, currentAssets, loading, analyzing,
    generatingAssets, requestAssetGeneration,
    selectScript, analyzeScript,
    createAsset, updateAsset, deleteAsset,
  } = useStudioStore();

  useStudioInboxPoller();

  const [activeTab, setActiveTab] = useState<FsAssetType>('character');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FsAsset | null>(null);
  const [angleModalAssetId, setAngleModalAssetId] = useState<string | null>(null);

  // 手动添加表单
  const [addName, setAddName] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [addVoiceName, setAddVoiceName] = useState('Zephyr');

  useEffect(() => {
    if (scriptId) selectScript(scriptId);
  }, [scriptId, selectScript]);

  const filteredAssets = currentAssets.filter((a: FsAsset) => a.type === activeTab);
  const characterCount = currentAssets.filter((a: FsAsset) => a.type === 'character').length;
  const sceneCount = currentAssets.filter((a: FsAsset) => a.type === 'scene').length;
  const propCount = currentAssets.filter((a: FsAsset) => a.type === 'prop').length;

  const counts: Record<FsAssetType, number> = {
    character: characterCount,
    scene: sceneCount,
    prop: propCount,
  };

  const [analyzingCategory, setAnalyzingCategory] = useState<FsAssetType | null>(null);

  const handleAiAnalyze = async (category: FsAssetType) => {
    if (!currentScript) return;
    setAnalyzingCategory(category);
    await analyzeScript(currentScript.id, category);
    setAnalyzingCategory(null);
  };

  const handleBatchGenerate = async () => {
    const assetsToGenerate = filteredAssets.filter((a: FsAsset) => !generatingAssets[a.id]);
    if (assetsToGenerate.length === 0) {
      alert('所有资产都已经在生成中或没有需要生成的资产。');
      return;
    }
    if (!confirm(`确定要批量生成 ${assetsToGenerate.length} 个${activeTabConfig.label}吗？`)) return;

    const artStyle = (currentScript?.metadata as any)?.artStyle as string | undefined;
    const scriptTitle = currentScript?.title || 'Untitled';
    const projectId = `projects/${scriptTitle}`;
    const aspectRatio = activeTab === 'prop' ? 'IMAGE_ASPECT_RATIO_SQUARE' : 'IMAGE_ASPECT_RATIO_LANDSCAPE';

    // 标记所有待生成资产为 loading
    useStudioStore.setState(s => ({
      generatingAssets: { ...s.generatingAssets, ...Object.fromEntries(assetsToGenerate.map(a => [a.id, true])) }
    }));

    // 构建任务列表
    const allTasks = assetsToGenerate.map(asset => ({
      prompt: getDefaultAssetPrompt(asset, artStyle),
      targetType: asset.type === 'character' ? 'characterImage' : 'locationImage',
      meta: { fsAssetId: asset.id, charName: asset.name },
    }));

    // 每 4 个一批，逐批发送（与场景多角度一致）
    const CHUNK_SIZE = 4;
    for (let i = 0; i < allTasks.length; i += CHUNK_SIZE) {
      const chunk = allTasks.slice(i, i + CHUNK_SIZE);
      const chunkAssets = assetsToGenerate.slice(i, i + CHUNK_SIZE);

      try {
        const res = await fetch('/api/generate-assets/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: chunk, projectId, aspectRatio }),
        });
        const data = await res.json();

        if (data.success && data.results) {
          for (let j = 0; j < data.results.length; j++) {
            if (data.results[j].url) {
              useStudioStore.getState().updateAssetThumbnail(chunkAssets[j].id, data.results[j].url);
            }
          }
        }
      } catch (e) {
        console.error(`Batch chunk ${Math.floor(i / CHUNK_SIZE) + 1} failed:`, e);
      }

      // 清除这一批的 loading 状态
      useStudioStore.setState(s => ({
        generatingAssets: { ...s.generatingAssets, ...Object.fromEntries(chunkAssets.map(a => [a.id, false])) }
      }));
    }
  };

  const handleAddAsset = async () => {
    if (!addName.trim()) return;
    await createAsset({
      scriptId,
      type: activeTab,
      name: addName.trim(),
      description: addDesc.trim(),
      source: 'manual',
      data: {},
    });
    setShowAddDialog(false);
    setAddName('');
    setAddDesc('');
  };

  const handleSaveEdit = async () => {
    if (!editingAsset) return;
    const updatePayload: any = {
      name: addName.trim() || undefined,
      description: addDesc.trim() || undefined,
    };
    if (editingAsset.type === 'character') {
      updatePayload.data = { ...(editingAsset.data as any), voiceConfig: { voiceName: addVoiceName } };
    }
    await updateAsset(editingAsset.id, updatePayload);
    setShowEditDialog(false);
    setEditingAsset(null);
  };

  const openEditDialog = (asset: FsAsset) => {
    setEditingAsset(asset);
    
    // 如果资产本身没有 description，则尝试从 AI 提取的 data 中读取用于编辑
    const data = asset.data as any;
    let initialDesc = asset.description || '';
    if (!initialDesc && asset.type === 'character') {
      initialDesc = data?.appearance || data?.personality || '';
    } else if (!initialDesc && asset.type === 'scene') {
      initialDesc = data?.atmosphere || data?.imagePrompt || '';
    } else if (!initialDesc && asset.type === 'prop') {
      initialDesc = data?.imagePrompt || '';
    }

    setAddName(asset.name);
    setAddDesc(initialDesc);
    setAddVoiceName((asset.data as any)?.voiceConfig?.voiceName || 'Zephyr');
    setShowEditDialog(true);
  };

  if (loading || !currentScript) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const activeTabConfig = TYPE_TABS.find(t => t.key === activeTab)!;
  const isCurrentTabAnalyzing = analyzingCategory === activeTab;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 flex flex-col">
      {/* Header */}
      <div className="px-8 py-4 border-b border-neutral-800/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href={`/studio/scripts/${scriptId}`} className="text-neutral-500 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-xl font-bold text-white">{currentScript.title}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-neutral-500">资产管理</span>
              <ChevronRight className="w-3 h-3 text-neutral-700" />
              <span className="text-[10px] text-neutral-400">
                {characterCount} 角色 · {sceneCount} 场景 · {propCount} 道具
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push(`/studio/scripts/${scriptId}/storyboard`)}
          className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all"
        >
          下一步：分镜创作 <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tab 栏 */}
      <div className="px-8 py-3 border-b border-neutral-800/30">
        <div className="flex items-center gap-2">
          {TYPE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.key
                  ? `${tab.bg} ${tab.color} border border-current/20`
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50 border border-transparent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded-full">
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 资产列表 */}
      <div className="flex-1 overflow-y-auto p-8">
        {filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 gap-5">
            <div className={`w-14 h-14 rounded-2xl ${activeTabConfig.bg} flex items-center justify-center`}>
              {React.createElement(activeTabConfig.icon, { className: `w-7 h-7 ${activeTabConfig.color}` })}
            </div>
            <div className="text-center">
              <p className="text-neutral-400 text-sm mb-1">暂无{activeTabConfig.label}</p>
              <p className="text-neutral-600 text-xs">点击下方按钮从剧本中 AI 提取，或手动添加</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleAiAnalyze(activeTab)}
                disabled={!!analyzingCategory}
                className={`flex items-center gap-1.5 px-4 py-2 text-white text-sm font-bold rounded-lg disabled:opacity-50 ${activeTabConfig.color.replace('text-', 'bg-').replace('-400', '-600')} hover:opacity-90`}
              >
                {isCurrentTabAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isCurrentTabAnalyzing ? `提取${activeTabConfig.label}中...` : `AI 提取${activeTabConfig.label}`}
              </button>
              <button
                onClick={() => { setShowAddDialog(true); setAddName(''); setAddDesc(''); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-bold rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" /> 手动添加
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-neutral-500">{filteredAssets.length} 个{activeTabConfig.label}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchGenerate}
                disabled={filteredAssets.length === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-lg disabled:opacity-50 transition-colors shadow-lg shadow-indigo-900/20"
              >
                <Wand2 className="w-3 h-3" /> 批量生成
              </button>
              <button
                onClick={() => handleAiAnalyze(activeTab)}
                disabled={!!analyzingCategory}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/10 rounded-lg disabled:opacity-50 transition-colors"
              >
                {isCurrentTabAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {isCurrentTabAnalyzing ? '提取中...' : `AI 提取${activeTabConfig.label}`}
              </button>
              <button
                onClick={() => { setShowAddDialog(true); setAddName(''); setAddDesc(''); }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg"
              >
                <Plus className="w-3 h-3" /> 添加
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAssets.map((asset: FsAsset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onOpenAngleModal={() => setAngleModalAssetId(asset.id)}
              onEdit={() => openEditDialog(asset)}
              onDelete={async () => {
                if (confirm(`确定删除「${asset.name}」？`)) {
                  await deleteAsset(asset.id);
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* 手动添加资产弹窗 */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-neutral-900 border border-neutral-700/50 rounded-2xl w-[420px] shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold text-white">添加{TYPE_TABS.find(t => t.key === activeTab)?.label}</h3>
              <button onClick={() => setShowAddDialog(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 mb-1.5 block">名称 *</label>
                <input
                  type="text"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50"
                  placeholder={activeTab === 'character' ? '角色名' : activeTab === 'scene' ? '场景名' : '道具名'}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 mb-1.5 block">描述</label>
                <textarea
                  value={addDesc}
                  onChange={e => setAddDesc(e.target.value)}
                  className="w-full h-24 bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50 resize-none"
                  placeholder={activeTab === 'character' ? '外观、性格、背景...' : activeTab === 'scene' ? '氛围、时间、天气...' : '外观、用途...'}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-end gap-3">
              <button onClick={() => setShowAddDialog(false)} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-300">取消</button>
              <button onClick={handleAddAsset} disabled={!addName.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-lg disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" /> 添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑资产弹窗 */}
      {showEditDialog && editingAsset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-neutral-900 border border-neutral-700/50 rounded-2xl w-[420px] shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold text-white">编辑{TYPE_TABS.find(t => t.key === editingAsset.type)?.label}</h3>
              <button onClick={() => { setShowEditDialog(false); setEditingAsset(null); }} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 mb-1.5 block">名称</label>
                <input type="text" value={addName} onChange={e => setAddName(e.target.value)} className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50" autoFocus />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 mb-1.5 block">描述</label>
                <textarea value={addDesc} onChange={e => setAddDesc(e.target.value)} className="w-full h-24 bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50 resize-none" />
              </div>
              {editingAsset.type === 'character' && (
                <div>
                  <label className="text-xs font-bold text-neutral-400 mb-1.5 block">配音音色</label>
                  <select 
                    value={addVoiceName} 
                    onChange={e => setAddVoiceName(e.target.value)}
                    className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50"
                  >
                    {VOICE_OPTIONS.map((group, idx) => (
                      <optgroup key={idx} label={group.group}>
                        {group.options.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-end gap-3">
              <button onClick={() => { setShowEditDialog(false); setEditingAsset(null); }} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-300">取消</button>
              <button onClick={handleSaveEdit} className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-lg">
                <Save className="w-3.5 h-3.5" /> 保存
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 场景多角度面板（页面级别，不受 AssetCard 重渲染影响） */}
      {angleModalAssetId && (() => {
        const angleAsset = currentAssets.find((a: FsAsset) => a.id === angleModalAssetId);
        return angleAsset && angleAsset.type === 'scene' ? (
          <SceneAngleModal asset={angleAsset} onClose={() => setAngleModalAssetId(null)} />
        ) : null;
      })()}
    </div>
  );
}
