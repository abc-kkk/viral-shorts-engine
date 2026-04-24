'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { Character, ScriptLine, InspirationItem, ScriptReview, CreativeMode, PublishInfo, TargetType, InboxItem } from './types';
import { bustUrlCache, bustUrlCacheMap } from './assetUrl';
import { DEFAULT_ART_STYLE } from './constants';

// ========================================
// Context 值类型定义
// ========================================

interface ProjectContextValue {
  // 项目元信息
  projectId: string;

  // Phase 控制
  currentPhase: number;
  setCurrentPhase: (phase: number) => void;

  // 全局设置
  artStyle: string;
  setArtStyle: (s: string) => void;
  flowUrl: string;
  setFlowUrl: (s: string) => void;
  useHitlMode: boolean;
  setUseHitlMode: (b: boolean) => void;
  aiProvider: 'gemini' | 'doubao';
  setAiProvider: (p: 'gemini' | 'doubao') => void;

  // Phase 1: 剧本室
  theme: string;
  setTheme: (s: string) => void;
  isBrainstorming: boolean;
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  scriptLines: ScriptLine[];
  setScriptLines: React.Dispatch<React.SetStateAction<ScriptLine[]>>;
  handleBrainstormDirectly: (themeParam: string) => Promise<void>;
  updateCharacter: (index: number, field: string, value: any) => void;
  updateScriptLine: (index: number, field: string, value: string) => void;
  addCharacter: () => void;
  removeCharacter: (index: number) => void;
  addScriptLine: (index: number) => void;
  removeScriptLine: (index: number) => void;
  moveScriptLine: (index: number, direction: 'up' | 'down') => void;

  // Phase 1 v2: 三步流水线
  writerStep: number;
  setWriterStep: (n: number) => void;
  inspirations: InspirationItem[];
  setInspirations: React.Dispatch<React.SetStateAction<InspirationItem[]>>;
  creativeMode: CreativeMode;
  setCreativeMode: (m: CreativeMode) => void;
  rawScript: string;
  setRawScript: (s: string) => void;
  scriptReview: ScriptReview | null;
  setScriptReview: (r: ScriptReview | null) => void;
  scriptIteration: number;
  isGeneratingScript: boolean;
  isIteratingScript: boolean;
  isReviewingScript: boolean;
  isSplittingScript: boolean;
  isFetchingReddit: boolean;
  userDirection: string;
  setUserDirection: (s: string) => void;
  handleFetchRedditJokes: (subreddit?: string) => Promise<void>;
  handleGenerateScript: () => Promise<void>;
  handleIterateScript: () => Promise<void>;
  handleReviewScript: () => Promise<void>;
  handleScriptToScenes: () => Promise<void>;
  handleAddManualInspiration: (title: string, content: string) => void;
  handleRemoveInspiration: (id: string) => void;
  handleSelectInspiration: (item: InspirationItem) => void;

  // Phase 2: 定妆室
  locationPrompt: string;
  setLocationPrompt: (s: string) => void;
  locationImage: string;
  setLocationImage: (s: string) => void;
  isProcessingLocation: 'prompt' | 'image' | null;
  setIsProcessingLocation: React.Dispatch<React.SetStateAction<'prompt' | 'image' | null>>;
  handleGenerateLocationPrompt: (sceneComposition?: string) => Promise<void>;
  generateLocationImage: (referenceKeywords?: string[]) => Promise<void>;
  characterPrompts: Record<number, string>;
  setCharacterPrompts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  characterImages: Record<number, string>;
  setCharacterImages: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  processingChars: Record<number, 'prompt' | 'image' | null>;
  handleGenerateCharacterPrompt: (index: number, sheetElements?: string) => Promise<void>;
  generateCastingImage: (index: number) => Promise<void>;

  // Phase 3: 画板区
  activeSceneIndex: number;
  setActiveSceneIndex: React.Dispatch<React.SetStateAction<number>>;
  sceneLocationPrompts: Record<number, string>;
  setSceneLocationPrompts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  sceneLocationImages: Record<number, string>;
  setSceneLocationImages: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  handleGenerateSceneLocationPrompt: (sceneIndex: number, sceneComposition?: string) => Promise<void>;
  generateSceneLocationImage: (sceneIndex: number, referenceKeywords?: string[]) => Promise<void>;
  startLayoutPrompts: Record<number, string>;
  setStartLayoutPrompts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  endLayoutPrompts: Record<number, string>;
  setEndLayoutPrompts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  sceneImagePrompts: Record<number, string>;
  setSceneImagePrompts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  sceneVideoPrompts: Record<number, string>;
  setSceneVideoPrompts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  sceneStartImagePrompts: Record<number, string>;
  setSceneStartImagePrompts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  sceneDurations: Record<number, number>;
  setSceneDurations: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  sceneVideoTrimStart: Record<number, number>;
  setSceneVideoTrimStart: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  sceneVideoTrimEnd: Record<number, number>;
  setSceneVideoTrimEnd: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  sceneImages: Record<number, string>;
  setSceneImages: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  sceneStartImages: Record<number, string>;
  setSceneStartImages: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  sceneImageRefs: Record<number, string>;
  setSceneImageRefs: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  sceneVideos: Record<number, string>;
  setSceneVideos: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  sceneAudio: Record<number, string>;
  setSceneAudio: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  sceneAudioDelays: Record<number, number>;
  setSceneAudioDelays: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  currentVideoTimes: Record<number, number>;
  setCurrentVideoTimes: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  sceneCharacters: Record<number, string[]>;
  setSceneCharacters: React.Dispatch<React.SetStateAction<Record<number, string[]>>>;
  processingScene: Record<number, 'action' | 'startImage' | 'image' | 'video' | 'voice' | null>;
  setProcessingScene: React.Dispatch<React.SetStateAction<Record<number, 'action' | 'startImage' | 'image' | 'video' | 'voice' | null>>>;
  handleGenerateActionPrompt: (i: number) => Promise<void>;
  handleGenerateEndFrame: (i: number) => Promise<void>;
  handleGenerateStartFrame: (i: number) => Promise<void>;
  handleGenerateVideo: (i: number) => Promise<void>;
  handleGenerateVoice: (i: number) => Promise<void>;

  // Publish info
  publishInfo?: PublishInfo;
  setPublishInfo: React.Dispatch<React.SetStateAction<PublishInfo | undefined>>;

  // カバー（Cover）
  coverPrompts: Record<string, string>;
  setCoverPrompts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  coverImages: Record<string, string>;
  setCoverImages: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  processingCovers: Record<string, 'prompt' | 'image' | null>;
  setProcessingCovers: React.Dispatch<React.SetStateAction<Record<string, 'prompt' | 'image' | null>>>;
  handleGenerateCoverPrompt: (ratio: string) => Promise<void>;
  handleGenerateCoverAsset: (ratio: string) => Promise<void>;

  // 全局操作
  handleClearProgress: () => void;
  getFullScriptContext: () => string;
}

/** 通用 API 请求脚手架：收敛所有的 POST 请求参数与错误处理 */
async function fetchApi<T = any>(endpoint: string, payload: any): Promise<T> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

// ========================================
// 拆分后的 Hooks
// ========================================
import { useProjectState } from './context/useProjectState';
import { useWriterRoom } from './context/useWriterRoom';
import { useCastingRoom } from './context/useCastingRoom';
import { useStoryboard } from './context/useStoryboard';
import { useInboxPoller } from './context/useInboxPoller';

// ========================================
// Provider 组装车间
// ========================================

export function ProjectProvider({ children, projectId }: { children: React.ReactNode; projectId: string }) {
  // 1. 基础状态及自动存取
  const state = useProjectState(projectId);

  // 2. 按阶段挂载业务逻辑 (传入 state)
  const writerRoom = useWriterRoom(state);
  const castingRoom = useCastingRoom(state, writerRoom.getFullScriptContext);
  const storyboard = useStoryboard(state, writerRoom.getFullScriptContext);
  
  // 3. 挂载 Chrome 扩展轮询器
  useInboxPoller(state);

  // ========================================
  // Context Value 拼装
  // ========================================
  const value: ProjectContextValue = {
    ...state,
    ...writerRoom,
    ...castingRoom,
    ...storyboard,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

// ========================================
// Hook
// ========================================

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used inside <ProjectProvider>');
  return ctx;
}
