'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Wand2, Image as ImageIcon, Video, Play, CheckCircle2, Mic, Loader2, ChevronDown, MapPin, Film, Users, X, Plus, CopyPlus } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useStudioStore } from '@/lib/studio/store/useStudioStore';
import type { FsAsset } from '@/lib/studio/types';
import { useStudioInboxPoller } from '@/components/studio/assets/useStudioInboxPoller';

type FrameMode = 'first_only' | 'first_and_last';

export default function StoryboardLayoutPage() {
  useStudioInboxPoller();

  const router = useRouter();
  const params = useParams();
  const scriptId = params.id as string;
  
  const { currentScript, currentAssets, storyboardGroups, analyzing, selectScript, extractStoryboard, updateStoryboardShot } = useStudioStore();
  
  const [activeShot, setActiveShot] = useState<string | null>(null);
  const [frameMode, setFrameMode] = useState<FrameMode>('first_and_last');
  const [shotSceneMap, setShotSceneMap] = useState<Record<string, string>>({});
  const [showScenePicker, setShowScenePicker] = useState(false);
  const [editablePrompts, setEditablePrompts] = useState<Record<string, { first: string; last: string; video: string }>>({});
  // 角色覆盖层: { shotId: string[] } — 用户可增删，初始从 AI 提取
  const [shotCharOverrides, setShotCharOverrides] = useState<Record<string, string[]>>({});
  const [showCharPicker, setShowCharPicker] = useState(false);

  useEffect(() => {
    if (scriptId) selectScript(scriptId);
  }, [scriptId, selectScript]);

  const sceneAssets = useMemo(() => currentAssets.filter((a: FsAsset) => a.type === 'scene'), [currentAssets]);
  const characterAssets = useMemo(() => currentAssets.filter((a: FsAsset) => a.type === 'character'), [currentAssets]);

  // Set initial active shot
  useEffect(() => {
    if (storyboardGroups.length > 0 && !activeShot) {
      setActiveShot(storyboardGroups[0].shots[0]?.id || null);
    }
  }, [storyboardGroups, activeShot]);

  // Initialize editable prompts from AI-generated data
  useEffect(() => {
    if (storyboardGroups.length === 0) return;
    const newPrompts: Record<string, { first: string; last: string; video: string }> = {};
    for (const g of storyboardGroups) {
      for (const s of g.shots) {
        if (!editablePrompts[s.id]) {
          newPrompts[s.id] = {
            first: s.firstFramePrompt || '',
            last: s.lastFramePrompt || '',
            video: s.videoPrompt || '',
          };
        }
      }
    }
    if (Object.keys(newPrompts).length > 0) {
      setEditablePrompts(prev => ({ ...prev, ...newPrompts }));
    }
  }, [storyboardGroups]);

  // Auto-match shots to scene assets via group.sceneName
  useEffect(() => {
    if (storyboardGroups.length === 0 || sceneAssets.length === 0) return;
    const newMap: Record<string, string> = { ...shotSceneMap };
    let changed = false;
    for (const group of storyboardGroups) {
      for (const shot of group.shots) {
        if (newMap[shot.id]) continue;
        // Match by group.sceneName first
        if (group.sceneName) {
          const match = sceneAssets.find((s: FsAsset) => s.name === group.sceneName);
          if (match) { newMap[shot.id] = match.id; changed = true; continue; }
        }
        // Fallback: fuzzy match
        const matchText = `${group.title} ${group.context} ${shot.visual}`;
        for (const scene of sceneAssets) {
          if (matchText.includes(scene.name)) {
            newMap[shot.id] = scene.id; changed = true; break;
          }
        }
      }
    }
    if (changed) setShotSceneMap(newMap);
  }, [storyboardGroups, sceneAssets, shotSceneMap]);

  const handleExtract = () => extractStoryboard(scriptId);

  const getActiveShotData = () => {
    if (!activeShot) return null;
    for (const group of storyboardGroups) {
      const shot = group.shots.find(s => s.id === activeShot);
      if (shot) return { group, shot };
    }
    return null;
  };

  const activeData = getActiveShotData();
  const boundSceneId = activeShot ? shotSceneMap[activeShot] : null;
  const boundScene = boundSceneId ? sceneAssets.find((a: FsAsset) => a.id === boundSceneId) : null;

  // 所有镜头的扁平列表，用于定位"上一镜头"
  const allShotsFlat = useMemo(() => {
    const flat: { groupId: string; shot: typeof storyboardGroups[0]['shots'][0]; globalIndex: number }[] = [];
    let idx = 0;
    for (const g of storyboardGroups) {
      for (const s of g.shots) {
        flat.push({ groupId: g.id, shot: s, globalIndex: idx });
        idx++;
      }
    }
    return flat;
  }, [storyboardGroups]);

  const getPreviousShot = () => {
    if (!activeShot) return null;
    const curIdx = allShotsFlat.findIndex(f => f.shot.id === activeShot);
    if (curIdx <= 0) return null;
    return allShotsFlat[curIdx - 1].shot;
  };

  /** 将上一镜头的尾帧图+尾帧提示词复制为当前镜头的首帧 */
  const handleCopyFromPrevLastFrame = async () => {
    const prevShot = getPreviousShot();
    if (!prevShot || !activeShot) return;

    // 复制图片
    if (prevShot.lastFrameImage) {
      await updateStoryboardShot(activeShot, {
        firstFrameImage: prevShot.lastFrameImage,
      });
    }

    // 复制提示词
    const prevPrompts = editablePrompts[prevShot.id];
    if (prevPrompts?.last) {
      updatePrompt('first', prevPrompts.last);
      // 保存到 DB
      await updateStoryboardShot(activeShot, {
        firstFramePrompt: prevPrompts.last,
        ...(prevShot.lastFrameImage ? { firstFrameImage: prevShot.lastFrameImage } : {}),
      });
    }
  };

  // 角色列表：优先用户覆盖 → 否则用 AI 提取的 shot.characters
  const shotCharacters = useMemo(() => {
    if (!activeShot || !activeData) return [];
    const names = shotCharOverrides[activeShot] ?? activeData.shot.characters ?? [];
    return names.map(name => {
      const asset = characterAssets.find((a: FsAsset) => a.name === name);
      return { name, asset: asset || null };
    });
  }, [activeShot, activeData, shotCharOverrides, characterAssets]);

  const addCharToShot = (name: string) => {
    if (!activeShot) return;
    const current = shotCharOverrides[activeShot] ?? activeData?.shot.characters ?? [];
    if (current.includes(name)) return;
    setShotCharOverrides(prev => ({ ...prev, [activeShot]: [...current, name] }));
    setShowCharPicker(false);
  };
  const removeCharFromShot = (name: string) => {
    if (!activeShot) return;
    const current = shotCharOverrides[activeShot] ?? activeData?.shot.characters ?? [];
    setShotCharOverrides(prev => ({ ...prev, [activeShot]: current.filter(n => n !== name) }));
  };

  const currentPrompts = activeShot ? editablePrompts[activeShot] : null;

  const updatePrompt = (field: 'first' | 'last' | 'video', value: string) => {
    if (!activeShot) return;
    setEditablePrompts(prev => ({
      ...prev,
      [activeShot]: { ...prev[activeShot], [field]: value },
    }));
  };

  const handleSavePrompts = async () => {
    if (!activeShot || !currentPrompts) return;
    await updateStoryboardShot(activeShot, {
      firstFramePrompt: currentPrompts.first,
      lastFramePrompt: currentPrompts.last,
      videoPrompt: currentPrompts.video,
    });
  };

  // AI 生成提示词
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const handleGeneratePrompts = async () => {
    if (!activeData || !activeShot) return;
    setGeneratingPrompts(true);
    try {
      const res = await fetch(`/api/studio/scripts/${scriptId}/generate-shot-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shotVisual: activeData.shot.visual,
          shotDialogue: activeData.shot.dialogue,
          groupContext: activeData.group.context,
          groupTitle: activeData.group.title,
          characters: shotCharacters.map(c => c.name),
          sceneName: boundScene?.name || activeData.group.sceneName || '',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      const newPrompts = {
        first: data.firstFramePrompt || currentPrompts?.first || '',
        last: data.lastFramePrompt || currentPrompts?.last || '',
        video: data.videoPrompt || currentPrompts?.video || '',
      };
      
      setEditablePrompts(prev => ({
        ...prev,
        [activeShot]: newPrompts,
      }));
      
      // Save directly to DB
      await updateStoryboardShot(activeShot, {
        firstFramePrompt: newPrompts.first,
        lastFramePrompt: newPrompts.last,
        videoPrompt: newPrompts.video,
      });
      
    } catch (e: any) {
      console.error('生成提示词失败:', e);
    } finally {
      setGeneratingPrompts(false);
    }
  };

  // 生成帧图 (Flow Automator)
  const [generatingFrame, setGeneratingFrame] = useState<Record<string, string>>({}); // { shotId: 'first' | 'last' }

  const handleGenerateFrame = async (type: 'first' | 'last') => {
    if (!activeShot || !currentPrompts || !activeData) return;
    const promptText = type === 'first' ? currentPrompts.first : currentPrompts.last;
    if (!promptText) return alert('请先生成或填写提示词');

    setGeneratingFrame(prev => ({ ...prev, [activeShot]: type }));
    try {
      const { generateFlow, extractRefKeywords } = await import('@/lib/studio/generateFlow');

      // 计算镜头序号
      let shotIndex = 0;
      for (const group of storyboardGroups) {
        for (const shot of group.shots) {
          shotIndex++;
          if (shot.id === activeShot) break;
        }
        if (group.shots.some(s => s.id === activeShot)) break;
      }

      const result = await generateFlow({
        kind: 'storyboardFrame',
        scriptId,
        scriptTitle: currentScript?.title || scriptId,
        shotId: activeShot,
        shotIndex,
        frameType: type,
        prompt: promptText,
        referenceKeywords: extractRefKeywords(promptText),
      });

      if (!result.success) throw new Error(result.error);

      if (result.url) {
        await updateStoryboardShot(activeShot, {
          [type === 'first' ? 'firstFrameImage' : 'lastFrameImage']: result.url
        });
      }
    } catch (e: any) {
      console.error(`生成${type === 'first' ? '首' : '尾'}帧失败:`, e);
      alert(`生成失败: ${e.message}`);
    } finally {
      setGeneratingFrame(prev => { const n = { ...prev }; delete n[activeShot!]; return n; });
    }
  };

  // 高亮 {@xxx} 标签
  const renderRefTags = (text: string) => {
    const parts = text.split(/(\{@[^{}]+\})/g);
    return parts.map((part, i) => {
      if (part.startsWith('{@') && part.endsWith('}')) {
        const refName = part.slice(2, -1);
        const isChar = characterAssets.some((a: FsAsset) => a.name === refName);
        const isScene = sceneAssets.some((a: FsAsset) => a.name === refName);
        const color = isChar ? 'text-blue-400 bg-blue-500/15' : isScene ? 'text-purple-400 bg-purple-500/15' : 'text-amber-400 bg-amber-500/15';
        return <span key={i} className={`${color} px-1 rounded text-[10px] font-bold`}>{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!currentScript) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const totalShots = storyboardGroups.reduce((sum, g) => sum + g.shots.length, 0);

  return (
    <div className="h-screen bg-[#0a0a0a] text-neutral-100 flex flex-col overflow-hidden">
      {/* Top Nav */}
      <div className="h-12 px-5 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-900/50 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-400">{currentScript.title}</span>
            <span className="text-neutral-700">/</span>
            <span className="text-white font-bold">分镜创作室</span>
          </div>
          {storyboardGroups.length > 0 && (
            <span className="text-[10px] text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">
              {storyboardGroups.length} 组 · {totalShots} 镜头
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExtract} disabled={analyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-lg transition-colors disabled:opacity-50">
            {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 text-amber-500" />}
            {analyzing ? 'AI 提取中...' : (storyboardGroups.length > 0 ? '重新提取' : 'AI 提取分镜')}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Storyboard */}
        <div className="w-[50%] border-r border-neutral-800/80 bg-[#0d0d0d] overflow-y-auto">
          {storyboardGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Wand2 className="w-12 h-12 text-neutral-800" />
              <p className="text-neutral-500 text-sm">还没有分镜数据</p>
              <button onClick={handleExtract} disabled={analyzing}
                className="px-6 py-2.5 bg-amber-600/20 text-amber-500 border border-amber-500/30 hover:bg-amber-600/40 rounded-xl font-bold text-sm transition-colors flex items-center gap-2">
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {analyzing ? '正在提取...' : '从剧本中 AI 提取分镜'}
              </button>
            </div>
          ) : (
            <div className="p-3 space-y-4">
              {storyboardGroups.map((group) => (
                <div key={group.id} className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-neutral-900/80 border-b border-neutral-800/80">
                    <h3 className="font-bold text-amber-500 text-xs">{group.title}</h3>
                  </div>
                  <div className="px-3 py-1.5 bg-neutral-900/30 text-[11px] text-neutral-400 leading-relaxed border-b border-neutral-800/50">
                    {group.context}
                  </div>
                  <div className="p-2 space-y-2 bg-black/20">
                    {group.shots.map((shot, sIdx) => {
                      const isActive = activeShot === shot.id;
                      return (
                        <div key={shot.id} onClick={() => setActiveShot(shot.id)}
                          className={`rounded-lg border transition-all overflow-hidden cursor-pointer ${
                            isActive ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-neutral-800/80 hover:border-neutral-700'
                          }`}>
                          <div className={`px-3 py-1.5 flex items-center justify-between ${isActive ? 'bg-amber-500/10' : 'bg-neutral-900/50'}`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isActive ? 'text-amber-400' : 'text-neutral-400'}`}>镜头 {sIdx + 1}</span>
                              {/* 角色标签 */}
                              {shot.characters?.length > 0 && (
                                <div className="flex items-center gap-1">
                                  {shot.characters.slice(0, 3).map(c => (
                                    <span key={c} className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400/80 rounded font-medium">{c}</span>
                                  ))}
                                  {shot.characters.length > 3 && <span className="text-[9px] text-neutral-500">+{shot.characters.length - 3}</span>}
                                </div>
                              )}
                            </div>
                            {shot.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                          </div>
                          <div className={`px-3 py-2 ${isActive ? 'bg-neutral-900/40' : 'bg-neutral-900/20'}`}>
                            <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">{shot.visual}</p>
                            {shot.dialogue && (
                              <p className="text-[10px] text-neutral-500 mt-1 line-clamp-1 italic">💬 {shot.dialogue}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Creation */}
        <div className="flex-1 bg-black overflow-y-auto">
          {activeData && currentPrompts ? (
            <div className="p-4 space-y-4 max-w-2xl mx-auto">

              {/* 场景 + 角色 */}
              <div className="flex gap-3">
                {/* 场景参考 */}
                <div className="flex-1 bg-neutral-900/40 border border-neutral-800 rounded-xl p-3">
                  <div className="text-[10px] text-purple-400 font-bold mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> 场景参考</div>
                  {boundScene ? (
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-8 rounded overflow-hidden border border-neutral-700 bg-neutral-900 shrink-0">
                        {boundScene.thumbnail ? <img src={boundScene.thumbnail} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><MapPin className="w-3 h-3 text-neutral-700" /></div>}
                      </div>
                      <span className="text-xs text-white font-bold truncate flex-1">{boundScene.name}</span>
                      <button onClick={() => setShowScenePicker(!showScenePicker)} className="text-[9px] text-neutral-500 hover:text-white border border-neutral-700 px-1.5 py-0.5 rounded">换</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowScenePicker(!showScenePicker)} className="text-xs text-purple-400 hover:text-purple-300">选择场景...</button>
                  )}
                  {showScenePicker && (
                    <div className="mt-2 border-t border-neutral-800 pt-2 space-y-1 max-h-32 overflow-y-auto">
                      {sceneAssets.map((scene: FsAsset) => (
                        <button key={scene.id} onClick={() => {
                          if (!activeShot) return;
                          // 1. 更新场景绑定
                          setShotSceneMap(prev => ({ ...prev, [activeShot]: scene.id }));
                          // 2. 替换提示词中的场景引用
                          const oldName = boundScene?.name || '场景名';
                          setEditablePrompts(prev => {
                            const cur = prev[activeShot];
                            if (!cur) return prev;
                            const replace = (t: string) => t.replace(new RegExp(`\\{@${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g'), `{@${scene.name}}`).replace(/\{@场景名\}/g, `{@${scene.name}}`);
                            return { ...prev, [activeShot]: { first: replace(cur.first), last: replace(cur.last), video: replace(cur.video) } };
                          });
                          setShowScenePicker(false);
                        }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs ${boundSceneId === scene.id ? 'bg-purple-500/15 text-purple-300' : 'hover:bg-neutral-800 text-neutral-300'}`}>
                          <div className="w-8 h-5 rounded overflow-hidden bg-neutral-900 shrink-0 border border-neutral-800">
                            {scene.thumbnail ? <img src={scene.thumbnail} alt="" className="w-full h-full object-cover" /> : <MapPin className="w-2 h-2 text-neutral-700 m-auto" />}
                          </div>
                          <span className="truncate">{scene.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 涉及角色 */}
                <div className="w-44 bg-neutral-900/40 border border-neutral-800 rounded-xl p-3 relative">
                  <div className="text-[10px] text-blue-400 font-bold mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 涉及角色</span>
                    <button onClick={() => setShowCharPicker(!showCharPicker)} className="text-neutral-500 hover:text-blue-400 transition-colors"><Plus className="w-3 h-3" /></button>
                  </div>
                  {shotCharacters.length > 0 ? (
                    <div className="space-y-1">
                      {shotCharacters.map(({ name, asset }) => (
                        <div key={name} className="flex items-center gap-1.5 group/char">
                          <div className="w-5 h-5 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 shrink-0">
                            {asset?.thumbnail ? <img src={asset.thumbnail} alt="" className="w-full h-full object-cover" /> : <Users className="w-2.5 h-2.5 text-neutral-600 m-auto mt-1" />}
                          </div>
                          <span className="text-[10px] text-neutral-200 truncate flex-1">{name}</span>
                          <button onClick={() => removeCharFromShot(name)} className="opacity-0 group-hover/char:opacity-100 text-neutral-600 hover:text-red-400 transition-all"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-neutral-600">无角色，点 + 添加</span>
                  )}
                  {showCharPicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 z-20 shadow-xl max-h-40 overflow-y-auto">
                      {characterAssets.filter((a: FsAsset) => !shotCharacters.some(c => c.name === a.name)).map((a: FsAsset) => (
                        <button key={a.id} onClick={() => addCharToShot(a.name)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[10px] hover:bg-neutral-800 text-neutral-300">
                          <div className="w-5 h-5 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 shrink-0">
                            {a.thumbnail ? <img src={a.thumbnail} alt="" className="w-full h-full object-cover" /> : <Users className="w-2.5 h-2.5 text-neutral-600 m-auto mt-1" />}
                          </div>
                          {a.name}
                        </button>
                      ))}
                      {characterAssets.filter((a: FsAsset) => !shotCharacters.some(c => c.name === a.name)).length === 0 && (
                        <div className="text-[10px] text-neutral-600 px-2 py-1">所有角色已添加</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* AI 生成提示词 + 帧模式 */}
              <div className="flex gap-2">
                <button onClick={handleGeneratePrompts} disabled={generatingPrompts}
                  className="flex-1 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 text-xs transition-all disabled:opacity-50">
                  {generatingPrompts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  {generatingPrompts ? 'AI 生成中...' : 'AI 生成提示词'}
                </button>
                <button onClick={() => setFrameMode('first_only')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${frameMode === 'first_only' ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-neutral-900/50 border-neutral-800 text-neutral-500 hover:text-neutral-300'}`}>
                  仅首帧
                </button>
                <button onClick={() => setFrameMode('first_and_last')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${frameMode === 'first_and_last' ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-neutral-900/50 border-neutral-800 text-neutral-500 hover:text-neutral-300'}`}>
                  首尾帧
                </button>
              </div>

              {/* 首帧 */}
              <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-neutral-800/80 bg-neutral-900/60 flex justify-between items-center">
                  <div className="font-bold text-xs text-emerald-400 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> 首帧提示词</div>
                  <span className="text-[10px] text-neutral-600">AI 生成 · 可编辑</span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="text-[10px] text-neutral-500 leading-relaxed">{renderRefTags(currentPrompts.first || '（AI 提取后自动填充）')}</div>
                  <textarea
                    className="w-full bg-black/60 border border-neutral-800 rounded-lg p-2.5 text-xs text-emerald-300 focus:outline-none focus:border-emerald-500/50 resize-none leading-relaxed"
                    rows={3}
                    value={currentPrompts.first}
                    onChange={e => updatePrompt('first', e.target.value)}
                    onBlur={handleSavePrompts}
                    placeholder="描述视频开始瞬间的静止画面..."
                  />
                  <div className="aspect-video bg-black border border-neutral-800 rounded-lg flex items-center justify-center overflow-hidden">
                    {activeData?.shot.firstFrameImage ? (
                      <img src={activeData.shot.firstFrameImage} alt="首帧" className="w-full h-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-1"><ImageIcon className="w-6 h-6 text-neutral-700" /><span className="text-[10px] text-neutral-600">首帧预览</span></div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGenerateFrame('first')}
                      disabled={!currentPrompts.first || !!generatingFrame[activeShot!]}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors disabled:opacity-50">
                      {generatingFrame[activeShot!] === 'first' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                      {generatingFrame[activeShot!] === 'first' ? '生成中...' : '生成首帧 (Flow)'}
                    </button>
                    {getPreviousShot() && (
                      <button
                        onClick={handleCopyFromPrevLastFrame}
                        className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors border border-neutral-700"
                        title="将上一镜头的尾帧（图片+提示词）复制为本镜头的首帧">
                        <CopyPlus className="w-3.5 h-3.5" />
                        上帧尾帧
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 尾帧 */}
              {frameMode === 'first_and_last' && (
                <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-neutral-800/80 bg-neutral-900/60 flex justify-between items-center">
                    <div className="font-bold text-xs text-blue-400 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> 尾帧提示词</div>
                    <span className="text-[10px] text-neutral-600">AI 生成 · 可编辑</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="text-[10px] text-neutral-500 leading-relaxed">{renderRefTags(currentPrompts.last || '（AI 提取后自动填充）')}</div>
                    <textarea
                      className="w-full bg-black/60 border border-neutral-800 rounded-lg p-2.5 text-xs text-blue-300 focus:outline-none focus:border-blue-500/50 resize-none leading-relaxed"
                      rows={3}
                      value={currentPrompts.last}
                      onChange={e => updatePrompt('last', e.target.value)}
                      onBlur={handleSavePrompts}
                      placeholder="描述视频结束瞬间的静止画面..."
                    />
                    <div className="aspect-video bg-black border border-neutral-800 rounded-lg flex items-center justify-center overflow-hidden">
                      {activeData?.shot.lastFrameImage ? (
                        <img src={activeData.shot.lastFrameImage} alt="尾帧" className="w-full h-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center gap-1"><ImageIcon className="w-6 h-6 text-neutral-700" /><span className="text-[10px] text-neutral-600">尾帧预览</span></div>
                      )}
                    </div>
                    <button
                      onClick={() => handleGenerateFrame('last')}
                      disabled={!currentPrompts.last || !!generatingFrame[activeShot!]}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors disabled:opacity-50">
                      {generatingFrame[activeShot!] === 'last' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                      {generatingFrame[activeShot!] === 'last' ? '生成中...' : '生成尾帧 (Flow)'}
                    </button>
                  </div>
                </div>
              )}

              {/* 视频动态提示词 + 渲染 */}
              <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-neutral-800/80 bg-neutral-900/60 flex justify-between items-center">
                  <div className="font-bold text-xs text-amber-400 flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> 视频动态提示词</div>
                  <span className="text-[10px] text-neutral-500">Veo 3.1</span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="text-[10px] text-neutral-500 leading-relaxed">{renderRefTags(currentPrompts.video || '（AI 提取后自动填充）')}</div>
                  <textarea
                    className="w-full bg-black/60 border border-neutral-800 rounded-lg p-2.5 text-xs text-amber-300 focus:outline-none focus:border-amber-500/50 resize-none leading-relaxed"
                    rows={4}
                    value={currentPrompts.video}
                    onChange={e => updatePrompt('video', e.target.value)}
                    onBlur={handleSavePrompts}
                    placeholder="描述从首帧到尾帧的完整动态过程、运镜和口播..."
                  />
                  <div className="aspect-video bg-black border border-neutral-800 border-dashed rounded-lg flex items-center justify-center overflow-hidden">
                    {activeData?.shot.videoUrl ? (
                      <video src={activeData.shot.videoUrl} controls className="w-full h-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-1"><Video className="w-6 h-6 text-neutral-700" /><span className="text-[10px] text-neutral-600">
                        {!currentPrompts.video ? '请先填写视频提示词' : (
                          frameMode === 'first_only' ? (activeData?.shot.firstFrameImage ? '可以渲染视频' : '需要先生成首帧图') :
                          (activeData?.shot.firstFrameImage && activeData?.shot.lastFrameImage ? '可以渲染视频' : '需要先生成首尾帧图')
                        )}
                      </span></div>
                    )}
                  </div>
                  <button 
                    onClick={async () => {
                      if (!activeShot || !currentPrompts?.video || !activeData) return;
                      setGeneratingFrame(prev => ({ ...prev, [activeShot]: 'video' as any }));
                      try {
                        const { generateFlow } = await import('@/lib/studio/generateFlow');
                        let shotIndex = 0;
                        for (const group of storyboardGroups) {
                          for (const shot of group.shots) {
                            shotIndex++;
                            if (shot.id === activeShot) break;
                          }
                          if (group.shots.some(s => s.id === activeShot)) break;
                        }

                        // 直接使用最新的首尾帧图片 URL
                        const refs: string[] = [];
                        if (activeData.shot.firstFrameImage) refs.push(activeData.shot.firstFrameImage);
                        if (frameMode === 'first_and_last' && activeData.shot.lastFrameImage) {
                          refs.push(activeData.shot.lastFrameImage);
                        }

                        const result = await generateFlow({
                          kind: 'storyboardVideo',
                          scriptId,
                          scriptTitle: currentScript?.title || scriptId,
                          shotId: activeShot,
                          shotIndex,
                          prompt: currentPrompts.video,
                          referenceKeywords: refs,
                        });

                        if (!result.success) throw new Error(result.error);

                        if (result.url) {
                          await updateStoryboardShot(activeShot, { videoUrl: result.url });
                        }
                      } catch (e: any) {
                        console.error('生成视频失败:', e);
                        alert(`生成失败: ${e.message}`);
                      } finally {
                        setGeneratingFrame(prev => { const n = { ...prev }; delete n[activeShot!]; return n; });
                      }
                    }}
                    disabled={
                      generatingFrame[activeShot!] === 'video' as any ||
                      !currentPrompts.video ||
                      (frameMode === 'first_only' && !activeData?.shot.firstFrameImage) ||
                      (frameMode === 'first_and_last' && (!activeData?.shot.firstFrameImage || !activeData?.shot.lastFrameImage))
                    } 
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors disabled:opacity-50 disabled:bg-emerald-600/30 disabled:text-emerald-500/70 disabled:cursor-not-allowed border border-emerald-600/30">
                    {generatingFrame[activeShot!] === 'video' as any ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    {generatingFrame[activeShot!] === 'video' as any ? '准备渲染...' : '渲染视频 (Veo 3.1)'}
                  </button>
                </div>
              </div>

              {/* 配音 */}
              {activeData.shot.dialogue && (
                <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl overflow-hidden mt-4">
                  <div className="px-3 py-2 border-b border-neutral-800/80 bg-neutral-900/60">
                    <div className="font-bold text-xs text-violet-400 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5" /> 角色配音
                      {activeData.shot.speaker && <span className="text-violet-200 ml-1">· {activeData.shot.speaker}</span>}
                    </div>
                  </div>
                  <div className="p-3 flex items-center justify-between gap-3">
                    <div className="text-xs text-neutral-400 flex-1 line-clamp-3">{activeData.shot.dialogue}</div>
                    <button 
                      onClick={async () => {
                        if (!activeData || !activeShot) return;
                        setGeneratingFrame(prev => ({ ...prev, [activeShot]: 'audio' as any }));
                        try {
                           let voiceName = 'Zephyr';
                           if (activeData.shot.speaker) {
                             const charAsset = characterAssets.find((a: FsAsset) => a.name === activeData.shot.speaker);
                             if (charAsset && (charAsset.data as any).voiceConfig?.voiceName) {
                               voiceName = (charAsset.data as any).voiceConfig.voiceName;
                             }
                           }

                           const res = await fetch('/api/generate-voice', {
                             method: 'POST',
                             headers: { 'Content-Type': 'application/json' },
                             body: JSON.stringify({
                               dialogue: activeData.shot.dialogue,
                               voiceName,
                               projectId: `projects/${currentScript?.title || scriptId}`
                             })
                           });
                           const data = await res.json();
                           if (!res.ok) throw new Error(data.error);
                           await updateStoryboardShot(activeShot, { audioUrl: data.audioUrl });
                        } catch (e: any) {
                           console.error('生成配音失败:', e);
                           alert(`配音生成失败: ${e.message}`);
                        } finally {
                           setGeneratingFrame(prev => { const n = { ...prev }; delete n[activeShot!]; return n; });
                        }
                      }}
                      disabled={generatingFrame[activeShot!] === 'audio' as any}
                      className="px-3 py-1.5 bg-violet-600/20 text-violet-400 border border-violet-500/30 hover:bg-violet-600/40 font-bold rounded-lg text-[10px] transition-colors shrink-0 disabled:opacity-50"
                    >
                      {generatingFrame[activeShot!] === 'audio' as any ? '生成中...' : '生成配音'}
                    </button>
                  </div>
                  {activeData.shot.audioUrl && (
                    <div className="px-3 py-2 border-t border-neutral-800/50 bg-black/20">
                      <audio controls src={activeData.shot.audioUrl} className="w-full h-8 outline-none" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-neutral-600">
              <ImageIcon className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm">请在左侧选择一个镜头</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
