'use client';

import React, { createContext, useContext } from 'react';
import type { PublishInfo } from './types';

// ========================================
// Context 值类型定义
// ========================================

interface ProjectContextValue {
  // 项目元信息
  projectId: string;

  // Phase 控制
  currentPhase: number;
  setCurrentPhase: (phase: number) => void;

  // Phase 1: 剧本室 方法
  handleBrainstormDirectly: (themeParam: string) => Promise<void>;
  updateCharacter: (index: number, field: string, value: any) => void;
  updateScriptLine: (index: number, field: string, value: string) => void;
  addCharacter: () => void;
  removeCharacter: (index: number) => void;
  addScriptLine: (index: number) => void;
  removeScriptLine: (index: number) => void;
  moveScriptLine: (index: number, direction: 'up' | 'down') => void;

  // Phase 1 v2: 三步流水线 方法
  handleFetchRedditJokes: (subreddit?: string) => Promise<void>;
  handleGenerateScript: () => Promise<void>;
  handleIterateScript: () => Promise<void>;
  handleReviewScript: () => Promise<void>;
  handleScriptToScenes: () => Promise<void>;
  handleAddManualInspiration: (title: string, content: string) => void;
  handleRemoveInspiration: (id: string) => void;
  handleSelectInspiration: (item: any) => void;

  // Phase 2 & 3: 定妆室 & 分镜室 (仅暴露方法)
  handleGenerateLocationPrompt: (sceneComposition?: string) => Promise<void>;
  generateLocationImage: (referenceKeywords?: string[]) => Promise<void>;
  handleGenerateCharacterPrompt: (index: number, sheetElements?: string) => Promise<void>;
  generateCastingImage: (index: number) => Promise<void>;

  handleGenerateSceneLocationPrompt: (sceneIndex: number, sceneComposition?: string) => Promise<void>;
  generateSceneLocationImage: (sceneIndex: number, referenceKeywords?: string[]) => Promise<void>;
  handleGenerateActionPrompt: (i: number) => Promise<void>;
  handleGenerateEndFrame: (i: number) => Promise<void>;
  handleGenerateStartFrame: (i: number) => Promise<void>;
  handleGenerateVideo: (i: number) => Promise<void>;
  handleGenerateVoice: (i: number) => Promise<void>;
  handleGenerateCoverPrompt: (ratio: string) => Promise<void>;
  handleGenerateCoverAsset: (ratio: string) => Promise<void>;

  // Publish info
  publishInfo?: PublishInfo;
  setPublishInfo: React.Dispatch<React.SetStateAction<PublishInfo | undefined>>;

  // 全局操作
  handleClearProgress: () => void;
  getFullScriptContext: () => string;
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
  const writerRoom = useWriterRoom(state.setCurrentPhase);
  const castingRoom = useCastingRoom(writerRoom.getFullScriptContext);
  const storyboard = useStoryboard(writerRoom.getFullScriptContext);
  
  // 3. 挂载 Chrome 扩展轮询器
  useInboxPoller();

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
