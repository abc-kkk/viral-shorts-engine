'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Users, MapPin, Package, Sparkles, Loader2, Plus, Trash2, Edit3, Save, X, Wand2, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStudioStore } from '@/lib/studio/store/useStudioStore';
import type { FsAsset, FsAssetType } from '@/lib/studio/types';
import AssetCard from '@/components/studio/assets/AssetCard';
import { useStudioInboxPoller } from '@/components/studio/assets/useStudioInboxPoller';

const TYPE_TABS: { key: FsAssetType; label: string; icon: LucideIcon; color: string; bg: string }[] = [
  { key: 'character', label: '角色', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'scene', label: '场景', icon: MapPin, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'prop', label: '道具', icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
];

export default function AssetManagePage() {
  const params = useParams();
  const scriptId = params.id as string;

  const {
    currentScript, currentAssets, loading, analyzing,
    selectScript, analyzeScript,
    createAsset, updateAsset, deleteAsset,
  } = useStudioStore();

  useStudioInboxPoller();

  const [activeTab, setActiveTab] = useState<FsAssetType>('character');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FsAsset | null>(null);

  // 手动添加表单
  const [addName, setAddName] = useState('');
  const [addDesc, setAddDesc] = useState('');

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

  const handleAiAnalyze = async () => {
    if (!currentScript) return;
    await analyzeScript(currentScript.id);
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
    await updateAsset(editingAsset.id, {
      name: addName.trim() || undefined,
      description: addDesc.trim() || undefined,
    });
    setShowEditDialog(false);
    setEditingAsset(null);
  };

  const openEditDialog = (asset: FsAsset) => {
    setEditingAsset(asset);
    setAddName(asset.name);
    setAddDesc(asset.description);
    setShowEditDialog(true);
  };

  if (loading || !currentScript) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          <button
            onClick={handleAiAnalyze}
            disabled={analyzing}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-lg disabled:opacity-50"
          >
            {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {analyzing ? 'AI 分析中...' : 'AI 提取资产'}
          </button>
        </div>
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
            <div className={`w-14 h-14 rounded-2xl ${TYPE_TABS.find(t => t.key === activeTab)?.bg} flex items-center justify-center`}>
              {React.createElement(TYPE_TABS.find(t => t.key === activeTab)?.icon || Users, { className: `w-7 h-7 ${TYPE_TABS.find(t => t.key === activeTab)?.color}` })}
            </div>
            <div className="text-center">
              <p className="text-neutral-400 text-sm mb-1">暂无{TYPE_TABS.find(t => t.key === activeTab)?.label}</p>
              <p className="text-neutral-600 text-xs">点击「AI 提取资产」自动分析剧本，或手动添加</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAiAnalyze}
                disabled={analyzing}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-lg disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI 提取
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
            <span className="text-xs text-neutral-500">{filteredAssets.length} 个{TYPE_TABS.find(t => t.key === activeTab)?.label}</span>
            <button
              onClick={() => { setShowAddDialog(true); setAddName(''); setAddDesc(''); }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg"
            >
              <Plus className="w-3 h-3" /> 添加
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAssets.map((asset: FsAsset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
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
    </div>
  );
}
