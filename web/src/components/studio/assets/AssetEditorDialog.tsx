/**
 * Freedom Studio — 资产编辑/创建弹窗
 */
'use client';

import { useState } from 'react';
import type { FsAsset, FsAssetType, FsAssetCreateInput, FsAssetUpdateInput } from '@/lib/studio/types';
import { VOICE_OPTIONS } from '@/lib/constants';

interface AssetEditorDialogProps {
  mode: 'create' | 'edit';
  presetType?: FsAssetType;
  asset?: FsAsset;
  onClose: () => void;
  onSave: (input: any) => Promise<FsAsset | null>;
}

const TYPE_OPTIONS: { value: FsAssetType; label: string; icon: string }[] = [
  { value: 'character', label: '角色', icon: '👤' },
  { value: 'scene', label: '场景', icon: '🏠' },
  { value: 'prop', label: '道具', icon: '🗡️' },
];

export default function AssetEditorDialog({
  mode,
  presetType = 'character',
  asset,
  onClose,
  onSave,
}: AssetEditorDialogProps) {
  const [type, setType] = useState<FsAssetType>(asset?.type || presetType);
  const [name, setName] = useState(asset?.name || '');
  const [description, setDescription] = useState(asset?.description || '');
  const [tagsInput, setTagsInput] = useState(asset?.tags?.join(', ') || '');
  const [saving, setSaving] = useState(false);

  // 角色特有字段
  const charData = (mode === 'edit' && asset?.type === 'character' ? asset.data : {}) as Record<string, unknown>;
  const [appearance, setAppearance] = useState((charData.appearance as string) || '');
  const [personality, setPersonality] = useState((charData.personality as string) || '');
  const [background, setBackground] = useState((charData.background as string) || '');
  const [relationships, setRelationships] = useState((charData.relationships as string) || '');
  const [voiceName, setVoiceName] = useState(((charData.voiceConfig as any)?.voiceName as string) || 'Zephyr');

  // 场景特有字段
  const sceneData = (mode === 'edit' && asset?.type === 'scene' ? asset.data : {}) as Record<string, unknown>;
  const [imagePrompt, setImagePrompt] = useState((sceneData.imagePrompt as string) || '');
  const [atmosphere, setAtmosphere] = useState((sceneData.atmosphere as string) || '');
  const [timeOfDay, setTimeOfDay] = useState((sceneData.timeOfDay as string) || '');

  // 道具特有字段
  const propData = (mode === 'edit' && asset?.type === 'prop' ? asset.data : {}) as Record<string, unknown>;
  const [propImagePrompt, setPropImagePrompt] = useState((propData.imagePrompt as string) || '');
  const [propCategory, setPropCategory] = useState((propData.category as string) || 'other');

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const tags = tagsInput
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);

    // 构建类型特有 data
    let data: Record<string, unknown> = {};
    if (type === 'character') {
      data = { ...charData, appearance, personality, background, relationships, voiceConfig: { voiceName } };
    } else if (type === 'scene') {
      data = { ...sceneData, imagePrompt, atmosphere, timeOfDay };
    } else if (type === 'prop') {
      data = { ...propData, imagePrompt: propImagePrompt, category: propCategory };
    }

    if (mode === 'create') {
      await onSave({ type, name: name.trim(), description, tags, data } as FsAssetCreateInput);
    } else {
      await onSave({ name: name.trim(), description, tags, data } as FsAssetUpdateInput);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === 'create' ? '➕ 新建资产' : `✏️ 编辑 ${asset?.name}`}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>

        {/* 表单 */}
        <div className="p-5 space-y-4">
          {/* 类型选择（创建模式） */}
          {mode === 'create' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">类型</label>
              <div className="flex gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setType(opt.value)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      type === opt.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 名称 */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入资产名称"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述"
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-600 resize-none"
            />
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">标签（逗号分隔）</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="古风, 女主, 聪慧"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* ===== 角色特有字段 ===== */}
          {type === 'character' && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">外观描述</label>
                <textarea
                  value={appearance}
                  onChange={(e) => setAppearance(e.target.value)}
                  placeholder="穿淡粉色古装，发髻高挽..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">性格特征</label>
                <input
                  type="text"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder="聪慧、隐忍、外柔内刚"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">背景故事</label>
                <textarea
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  placeholder="侯府嫡女，自幼被许配..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">角色关系（文字描述）</label>
                <textarea
                  value={relationships}
                  onChange={(e) => setRelationships(e.target.value)}
                  placeholder="与陆承恩是未婚夫妻，与沈知玉是同父异母姐妹，关系对立"
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">配音音色</label>
                  <select
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-600"
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
            </>
          )}

          {/* ===== 场景特有字段 ===== */}
          {type === 'scene' && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">场景画面描述</label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="古风庭院，牡丹盛开，亭台楼阁..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">氛围</label>
                <input
                  type="text"
                  value={atmosphere}
                  onChange={(e) => setAtmosphere(e.target.value)}
                  placeholder="明亮 / 阴郁 / 神秘"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">时间</label>
                <input
                  type="text"
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  placeholder="清晨 / 正午 / 黄昏 / 夜晚"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-600"
                />
              </div>
            </>
          )}

          {/* ===== 道具特有字段 ===== */}
          {type === 'prop' && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">道具外观描述</label>
                <textarea
                  value={propImagePrompt}
                  onChange={(e) => setPropImagePrompt(e.target.value)}
                  placeholder="赤金镶红宝石的如意，长约一尺..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">分类</label>
                <select
                  value={propCategory}
                  onChange={(e) => setPropCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-600"
                >
                  <option value="weapon">武器</option>
                  <option value="accessory">配饰</option>
                  <option value="vehicle">载具</option>
                  <option value="tool">工具</option>
                  <option value="consumable">消耗品</option>
                  <option value="decoration">装饰物</option>
                  <option value="other">其他</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-5 border-t border-gray-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? '保存中...' : mode === 'create' ? '创建' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
