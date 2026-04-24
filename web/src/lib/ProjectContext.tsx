'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { Character, ScriptLine, InspirationItem, ScriptReview, CreativeMode, PublishInfo } from './types';
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
  actionLayoutPrompts: Record<number, string>;
  setActionLayoutPrompts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
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
  processingScene: Record<number, 'action' | 'image' | 'video' | 'voice' | null>;
  setProcessingScene: React.Dispatch<React.SetStateAction<Record<number, 'action' | 'image' | 'video' | 'voice' | null>>>;
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
// Provider
// ========================================

export function ProjectProvider({ children, projectId }: { children: React.ReactNode; projectId: string }) {
  // Phase 控制
  const [currentPhase, setCurrentPhase] = useState(1);

  // 全局设置
  const [artStyle, setArtStyle] = useState(DEFAULT_ART_STYLE);
  const [flowUrl, setFlowUrl] = useState("");
  const [aiProvider, setAiProvider] = useState<'gemini' | 'doubao'>('gemini');

  // Phase 1: 剧本室
  const [useHitlMode, setUseHitlMode] = useState(true);
  const [theme, setTheme] = useState("");
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scriptLines, setScriptLines] = useState<ScriptLine[]>([]);

  // Phase 1 v2: 三步流水线
  const [publishInfo, setPublishInfo] = useState<PublishInfo>();
  const [writerStep, setWriterStep] = useState(1);
  const [inspirations, setInspirations] = useState<InspirationItem[]>([]);
  const [creativeMode, setCreativeMode] = useState<CreativeMode>('reference');
  const [rawScript, setRawScript] = useState("");
  const [scriptReview, setScriptReview] = useState<ScriptReview | null>(null);
  const [scriptIteration, setScriptIteration] = useState(0);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isIteratingScript, setIsIteratingScript] = useState(false);
  const [isReviewingScript, setIsReviewingScript] = useState(false);
  const [isSplittingScript, setIsSplittingScript] = useState(false);
  const [isFetchingReddit, setIsFetchingReddit] = useState(false);
  const [userDirection, setUserDirection] = useState("");

  // Phase 2: 定妆室
  const [locationPrompt, setLocationPrompt] = useState("");
  const [locationImage, setLocationImage] = useState("");
  const [isProcessingLocation, setIsProcessingLocation] = useState<'prompt' | 'image' | null>(null);
  const [characterPrompts, setCharacterPrompts] = useState<Record<number, string>>({});
  const [characterImages, setCharacterImages] = useState<Record<number, string>>({});
  const [processingChars, setProcessingChars] = useState<Record<number, 'prompt' | 'image' | null>>({});

  // Phase 3: 画板区
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [sceneLocationPrompts, setSceneLocationPrompts] = useState<Record<number, string>>({});
  const [sceneLocationImages, setSceneLocationImages] = useState<Record<number, string>>({});
  const [actionLayoutPrompts, setActionLayoutPrompts] = useState<Record<number, string>>({});
  const [sceneImagePrompts, setSceneImagePrompts] = useState<Record<number, string>>({});
  const [sceneVideoPrompts, setSceneVideoPrompts] = useState<Record<number, string>>({});
  const [sceneStartImagePrompts, setSceneStartImagePrompts] = useState<Record<number, string>>({});
  const [sceneDurations, setSceneDurations] = useState<Record<number, number>>({});
  const [sceneVideoTrimStart, setSceneVideoTrimStart] = useState<Record<number, number>>({});
  const [sceneVideoTrimEnd, setSceneVideoTrimEnd] = useState<Record<number, number>>({});
  const [sceneImages, setSceneImages] = useState<Record<number, string>>({});
  const [sceneStartImages, setSceneStartImages] = useState<Record<number, string>>({});
  const [sceneImageRefs, setSceneImageRefs] = useState<Record<number, string>>({});
  const [sceneVideos, setSceneVideos] = useState<Record<number, string>>({});
  const [sceneAudio, setSceneAudio] = useState<Record<number, string>>({});
  const [sceneAudioDelays, setSceneAudioDelays] = useState<Record<number, number>>({});
  const [currentVideoTimes, setCurrentVideoTimes] = useState<Record<number, number>>({});
  const [sceneCharacters, setSceneCharacters] = useState<Record<number, string[]>>({});
  const [processingScene, setProcessingScene] = useState<Record<number, 'action' | 'image' | 'video' | 'voice' | null>>({});

  // カバー（Cover）
  const [coverPrompts, setCoverPrompts] = useState<Record<string, string>>({});
  const [coverImages, setCoverImages] = useState<Record<string, string>>({});
  const [processingCovers, setProcessingCovers] = useState<Record<string, 'prompt' | 'image' | null>>({});

  const stateLoaded = useRef(false);

  // ========================================
  // 自动加载 (从 API)
  // ========================================

  // [BUGFIX] 给本地资源 URL 追加缓存破坏参数，防止浏览器使用之前 immutable 缓存的旧文件
  const bustCache = useCallback((url: string) => {
    if (!url || !url.startsWith('/api/serve/')) return url;
    // 去掉旧的 ?v= 参数，加上新的
    const base = url.split('?')[0];
    return `${base}?v=${Date.now()}`;
  }, []);

  const bustCacheMap = useCallback((map: Record<string | number, string>) => {
    const result: Record<string | number, string> = {};
    for (const [k, v] of Object.entries(map)) {
      result[k] = bustCache(v);
    }
    return result;
  }, [bustCache]);

  useEffect(() => {
    fetch(`/api/state?projectId=${encodeURIComponent(projectId)}`).then(r => r.json()).then(res => {
      if (res.success && Object.keys(res.data).length > 0) {
        const data = res.data;
        if (data.theme) setTheme(data.theme);
        if (data.artStyle) setArtStyle(data.artStyle);
        if (data.flowUrl) setFlowUrl(data.flowUrl);
        if (data.aiProvider) setAiProvider(data.aiProvider);
        if (data.characters) setCharacters(data.characters);
        if (data.scriptLines) setScriptLines(data.scriptLines);
        if (data.currentPhase) setCurrentPhase(data.currentPhase);
        // v2 新增
        if (data.publishInfo) setPublishInfo(data.publishInfo);
        if (data.writerStep) setWriterStep(data.writerStep);
        if (data.inspirations) setInspirations(data.inspirations);
        if (data.creativeMode) setCreativeMode(data.creativeMode);
        if (data.rawScript) setRawScript(data.rawScript);
        if (data.scriptReview) setScriptReview(data.scriptReview);
        if (data.scriptIteration) setScriptIteration(data.scriptIteration);
        if (data.userDirection) setUserDirection(data.userDirection);
        if (data.locationPrompt) setLocationPrompt(data.locationPrompt);
        if (data.locationImage) bustCache(data.locationImage) && setLocationImage(bustCache(data.locationImage));
        if (data.characterPrompts) setCharacterPrompts(data.characterPrompts);
        if (data.characterImages) setCharacterImages(bustCacheMap(data.characterImages));
        if (data.activeSceneIndex !== undefined) setActiveSceneIndex(data.activeSceneIndex);
        if (data.sceneLocationPrompts) setSceneLocationPrompts(data.sceneLocationPrompts);
        if (data.sceneLocationImages) setSceneLocationImages(bustCacheMap(data.sceneLocationImages));
        if (data.sceneImagePrompts) setSceneImagePrompts(data.sceneImagePrompts);
        if (data.sceneVideoPrompts) setSceneVideoPrompts(data.sceneVideoPrompts);
        if (data.sceneStartImagePrompts) setSceneStartImagePrompts(data.sceneStartImagePrompts);
        // 兼容旧数据
        if (data.sceneVisualPrompts) setSceneImagePrompts(data.sceneVisualPrompts);
        if (data.sceneCameraPrompts) setSceneVideoPrompts(data.sceneCameraPrompts);
        if (data.sceneCharacters) setSceneCharacters(data.sceneCharacters);
        if (data.sceneDurations) setSceneDurations(data.sceneDurations);
        if (data.sceneVideoTrimStart) setSceneVideoTrimStart(data.sceneVideoTrimStart);
        if (data.sceneVideoTrimEnd) setSceneVideoTrimEnd(data.sceneVideoTrimEnd);
        if (data.sceneImages) setSceneImages(bustCacheMap(data.sceneImages));
        if (data.sceneStartImages) setSceneStartImages(bustCacheMap(data.sceneStartImages));
        if (data.sceneImageRefs) setSceneImageRefs(data.sceneImageRefs);
        if (data.sceneVideos) setSceneVideos(bustCacheMap(data.sceneVideos));
        if (data.sceneAudio) setSceneAudio(bustCacheMap(data.sceneAudio));
        if (data.sceneAudioDelays) setSceneAudioDelays(data.sceneAudioDelays);
        // 封面数据
        if (data.coverPrompts) setCoverPrompts(data.coverPrompts);
        if (data.coverImages) setCoverImages(bustCacheMap(data.coverImages));
      }
      stateLoaded.current = true;
    }).catch(e => {
      console.error("Failed to load state", e);
      stateLoaded.current = true;
    });
  }, [projectId]);

  // ========================================
  // 自动保存 (debounce 1s)
  // ========================================
  useEffect(() => {
    if (!stateLoaded.current) return;
    const data = {
      projectId, theme, flowUrl, artStyle, aiProvider, characters, scriptLines, currentPhase,
      publishInfo,
      writerStep, inspirations, creativeMode, rawScript, scriptReview, scriptIteration, userDirection,
      locationPrompt, locationImage, characterPrompts, characterImages, activeSceneIndex,
      sceneLocationPrompts, sceneLocationImages,
      sceneImagePrompts, sceneVideoPrompts, sceneStartImagePrompts, sceneCharacters,
      sceneDurations, sceneVideoTrimStart, sceneVideoTrimEnd, sceneImages, sceneStartImages, sceneImageRefs, sceneVideos, sceneAudio, sceneAudioDelays,
      coverPrompts, coverImages
    };

    const timeout = setTimeout(() => {
      fetch(`/api/state?projectId=${encodeURIComponent(projectId)}`, { method: 'POST', body: JSON.stringify(data) })
        .catch(e => console.error("Save state error:", e));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [projectId, theme, flowUrl, artStyle, aiProvider, characters, scriptLines, currentPhase,
    publishInfo, coverPrompts, coverImages,
    writerStep, inspirations, creativeMode, rawScript, scriptReview, scriptIteration, userDirection,
    locationPrompt, locationImage, characterPrompts, characterImages, activeSceneIndex,
    sceneLocationPrompts, sceneLocationImages,
    sceneImagePrompts, sceneVideoPrompts, sceneStartImagePrompts, sceneCharacters,
    sceneDurations, sceneVideoTrimStart, sceneVideoTrimEnd, sceneImages, sceneStartImages, sceneImageRefs, sceneVideos, sceneAudio, sceneAudioDelays]);
    
  // ========================================
  // Chrome Extension Inbox Poller
  // ========================================
  useEffect(() => {
      if (!useHitlMode) return;
      const poller = setInterval(async () => {
          try {
              const res = await fetch('/api/extension/inbox');
              if (!res.ok) return;
              const body = await res.json();
              if (body.success && body.data && body.data.length > 0) {
                  for (const item of body.data) {
                      if (item.targetType === 'locationImage') {
                          setLocationImage(item.url);
                      } else if (item.targetType === 'sceneLocationImage' && item.index !== undefined) {
                          setSceneLocationImages(prev => ({ ...prev, [item.index]: item.url }));
                      } else if (item.targetType === 'characterImage' && item.index !== undefined) {
                          setCharacterImages(prev => ({ ...prev, [item.index]: item.url }));
                      } else if (item.targetType === 'sceneImage' && item.index !== undefined) {
                          setSceneImages(prev => ({ ...prev, [item.index]: item.url }));
                          if (item.referenceKeyword) {
                              setSceneImageRefs(prev => ({ ...prev, [item.index]: item.referenceKeyword }));
                          }
                      } else if (item.targetType === 'sceneStartImage' && item.index !== undefined) {
                          setSceneStartImages(prev => ({ ...prev, [item.index]: item.url }));
                          if (item.referenceKeyword) {
                              setSceneImageRefs(prev => ({ ...prev, [`start_${item.index}`]: item.referenceKeyword }));
                          }
                      } else if (item.targetType === 'sceneVideo' && item.index !== undefined) {
                          setSceneVideos(prev => ({ ...prev, [item.index]: item.url }));
                      } else if (item.targetType === 'coverImage' && item.meta?.ratio) {
                          setCoverImages(prev => ({ ...prev, [item.meta.ratio]: item.url }));
                      }
                  }
              }
          } catch(e) {}
      }, 3000);
      return () => clearInterval(poller);
  }, [useHitlMode]);

  // ========================================
  // 辅助函数
  // ========================================

  const getFullScriptContext = useCallback(() => {
    if (rawScript && rawScript.trim().length > 0) {
      return `【原始完整剧本（请重点体会环境、时间、氛围等场景细节）】\n${rawScript}`;
    }
    return scriptLines.map((s, i) => `[Scene ${i + 1}] ${s.speaker}: (Action: ${s.actionHint}) - "${s.dialogue}"`).join('\n');
  }, [rawScript, scriptLines]);

  // ========================================
  // Phase 1 业务逻辑
  // ========================================

  const handleBrainstormDirectly = useCallback(async (themeParam: string) => {
    setIsBrainstorming(true);
    try {
      const promptData = await fetchApi('/api/generate-prompts', { aiProvider, taskType: 'script', theme: themeParam });
      setCharacters(promptData.characters || []);
      setScriptLines(promptData.script || []);
      setCurrentPhase(1);
    } catch (err: any) {
      alert("剧本创作失败: " + err.message);
    } finally {
      setIsBrainstorming(false);
    }
  }, [aiProvider]);

  // ========================================
  // Phase 1 v2 业务逻辑（三步流水线）
  // ========================================

  /** 拉取灵感素材（精选中文段子 或 Reddit） */
  const handleFetchRedditJokes = useCallback(async (sourceOrSubreddit = 'curated') => {
    setIsFetchingReddit(true);
    try {
      // 如果参数是 'curated'，拉取精选中文段子；否则当作 subreddit 处理
      const apiUrl = sourceOrSubreddit === 'curated'
        ? '/api/fetch-inspiration?source=curated'
        : `/api/fetch-inspiration?source=reddit&subreddit=${sourceOrSubreddit}&limit=25&sort=top&time=all`;
      
      const res = await fetch(apiUrl);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInspirations(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newItems = (data.items || []).filter((item: InspirationItem) => !existingIds.has(item.id));
        return [...newItems, ...prev];
      });
    } catch (e: any) {
      alert('段子拉取失败: ' + e.message);
    } finally {
      setIsFetchingReddit(false);
    }
  }, []);

  /** 手动添加灵感素材 */
  const handleAddManualInspiration = useCallback((title: string, content: string) => {
    const item: InspirationItem = {
      id: `manual_${Date.now()}`,
      source: 'manual',
      title,
      content,
      addedAt: new Date().toISOString(),
    };
    setInspirations(prev => [item, ...prev]);
  }, []);

  /** 删除灵感素材 */
  const handleRemoveInspiration = useCallback((id: string) => {
    setInspirations(prev => prev.filter(p => p.id !== id));
  }, []);

  /** 选中灵感素材（填入 theme 作为创作输入） */
  const handleSelectInspiration = useCallback((item: InspirationItem) => {
    setTheme(`${item.title}\n\n${item.content}`);
  }, []);

  /** AI 生成纯文本叙事体剧本 */
  const handleGenerateScript = useCallback(async () => {
    if (!theme.trim()) {
      alert('请先在灵感库中选择素材或输入创作方向！');
      return;
    }
    setIsGeneratingScript(true);
    try {
      const data = await fetchApi('/api/generate-prompts', { aiProvider,
          taskType: 'script_v2',
          theme,
          creativeMode,
          userDirection,
      });
      setRawScript(data.script || '');
      setScriptReview(null);
      setScriptIteration(0);
      setWriterStep(2);
    } catch (e: any) {
      alert('剧本生成失败: ' + e.message);
    } finally {
      setIsGeneratingScript(false);
    }
  }, [aiProvider, theme, creativeMode, userDirection]);

  /** 基于当前剧本和用户反馈进行 AI 迭代修改 */
  const handleIterateScript = useCallback(async () => {
    if (!rawScript.trim()) return;
    if (!userDirection.trim()) {
      alert('请在下方输入框告诉 AI 你想怎么改！');
      return;
    }
    setIsIteratingScript(true);
    try {
      const data = await fetchApi('/api/generate-prompts', { aiProvider,
          taskType: 'script_iterate',
          theme: rawScript,
          userDirection,
      });
      setRawScript(data.script || '');
      setScriptReview(null);
    } catch (e: any) {
      alert('迭代剧本失败: ' + e.message);
    } finally {
      setIsIteratingScript(false);
    }
  }, [aiProvider, rawScript, userDirection]);

  /** AI 评审打分 */
  const handleReviewScript = useCallback(async () => {
    if (!rawScript.trim()) return;
    setIsReviewingScript(true);
    try {
      const data = await fetchApi('/api/generate-prompts', { aiProvider,
          taskType: 'script_review',
          theme: rawScript,
      });
      
      const review: ScriptReview = {
        hook: data.hook || 0,
        twist: data.twist || 0,
        pacing: data.pacing || 0,
        character: data.character || 0,
        retention: data.retention || 0,
        totalScore: data.totalScore || (data.hook + data.twist + data.pacing + data.character + data.retention),
        verdict: data.verdict || (data.totalScore >= 40 ? 'pass' : 'revise'),
        feedback: data.feedback || '',
        iteration: scriptIteration + 1,
      };
      setScriptReview(review);
      setScriptIteration(review.iteration);

      // 自动迭代逻辑：不合格 + 迭代 < 3 → 自动用反馈重写
      if (review.verdict === 'revise' && review.iteration < 3) {
        // 将修改建议注入 userDirection 以供下次生成参考
        setUserDirection(prev => `${prev ? prev + '\n' : ''}[第${review.iteration}轮评审反馈] ${review.feedback}`);
      }
    } catch (e: any) {
      alert('评审打分失败: ' + e.message);
    } finally {
      setIsReviewingScript(false);
    }
  }, [aiProvider, rawScript, scriptIteration]);

  /** 已通过剧本 → 拆解为角色 + 分镜对话 */
  const handleScriptToScenes = useCallback(async () => {
    if (!rawScript.trim()) return;
    setIsSplittingScript(true);
    try {
      const data = await fetchApi('/api/generate-prompts', { aiProvider,
          taskType: 'script_to_scenes',
          theme: rawScript,
      });
      setCharacters(data.characters || []);
      setScriptLines(data.script || []);
      setWriterStep(3);
    } catch (e: any) {
      alert('分镜拆解失败: ' + e.message);
    } finally {
      setIsSplittingScript(false);
    }
  }, [aiProvider, rawScript]);

  const updateCharacter = useCallback((index: number, field: string, value: any) => {
    setCharacters(prev => {
      const newChars = [...prev];
      newChars[index] = { ...newChars[index], [field]: value };
      return newChars;
    });
  }, []);

  const updateScriptLine = useCallback((index: number, field: string, value: string) => {
    setScriptLines(prev => {
      const newLines = [...prev];
      newLines[index] = { ...newLines[index], [field]: value };
      return newLines;
    });
  }, []);

  const addCharacter = useCallback(() => {
    setCharacters(prev => [...prev, { name: "新角色", persona: "", isProtagonist: false, voiceName: "Zephyr" }]);
  }, []);

  const removeCharacter = useCallback((index: number) => {
    setCharacters(prev => prev.filter((_, i) => i !== index));
  }, []);

  const addScriptLine = useCallback((index: number) => {
    setScriptLines(prev => {
      const newLines = [...prev];
      newLines.splice(index + 1, 0, { speaker: characters[0]?.name || "新角色", actionHint: "动作", dialogue: "台词" });
      return newLines;
    });
  }, [characters]);

  const removeScriptLine = useCallback((index: number) => {
    setScriptLines(prev => prev.filter((_, i) => i !== index));
  }, []);

  const moveScriptLine = useCallback((index: number, direction: 'up' | 'down') => {
    setScriptLines(prev => {
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;
      const newLines = [...prev];
      const swap = direction === 'up' ? index - 1 : index + 1;
      [newLines[index], newLines[swap]] = [newLines[swap], newLines[index]];
      return newLines;
    });
  }, []);

  // ========================================
  // Phase 2 业务逻辑
  // ========================================

  const handleGenerateLocationPrompt = useCallback(async (sceneComposition?: string) => {
    setIsProcessingLocation('prompt');
    try {
      const data = await fetchApi('/api/generate-prompts', { aiProvider,
          taskType: 'location_prompt',
          artStyle,
          fullScriptContext: getFullScriptContext(),
          sceneComposition: sceneComposition || undefined,
      });
      setLocationPrompt(data.prompt);
    } catch (e: any) {
      alert('场景提示词生成失败: ' + e.message);
    } finally {
      setIsProcessingLocation(null);
    }
  }, [aiProvider, artStyle, getFullScriptContext]);

  const generateLocationImage = useCallback(async (referenceKeywords?: string[]) => {
    if (!locationPrompt) return alert("请先生成场景视觉提示词");
    setIsProcessingLocation('image');
    try {
      await fetch('/api/extension/active-context', { method: 'POST', body: JSON.stringify({ projectId, targetType: 'locationImage' }) });
      const data = await fetchApi('/api/generate-assets', { 
        prompt: locationPrompt, 
        model: 'Nano Banana Pro', 
        referenceKeywords: referenceKeywords || [],
        flowUrl, 
        projectId, 
        fireAndForget: useHitlMode 
      });
      if (!data.fireAndForget) {
         setLocationImage(data.url);
      }
    } catch (e: any) {
      alert('场景生图失败: ' + e.message);
    } finally {
      setIsProcessingLocation(null);
    }
  }, [locationPrompt, flowUrl, projectId, useHitlMode]);

  const handleGenerateSceneLocationPrompt = useCallback(async (sceneIndex: number, sceneComposition?: string) => {
    setProcessingScene(p => ({ ...p, [sceneIndex]: 'action' })); // Reuse processingScene state
    try {
      const data = await fetchApi('/api/generate-prompts', { aiProvider,
          taskType: 'location_prompt',
          artStyle,
          fullScriptContext: getFullScriptContext(),
          sceneComposition: sceneComposition || undefined,
      });
      setSceneLocationPrompts(p => ({ ...p, [sceneIndex]: data.prompt }));
    } catch (e: any) {
      alert(`第 ${sceneIndex + 1} 幕自定义场景提示词生成失败: ` + e.message);
    } finally {
      setProcessingScene(p => ({ ...p, [sceneIndex]: null }));
    }
  }, [aiProvider, artStyle, getFullScriptContext]);

  const generateSceneLocationImage = useCallback(async (sceneIndex: number, referenceKeywords?: string[]) => {
    const prompt = sceneLocationPrompts[sceneIndex];
    if (!prompt) return alert("请先生成该幕场景视觉提示词");
    setProcessingScene(p => ({ ...p, [sceneIndex]: 'action' })); // Reuse processingScene state
    try {
      await fetch('/api/extension/active-context', { method: 'POST', body: JSON.stringify({ projectId, targetType: 'sceneLocationImage', index: sceneIndex }) });
      const data = await fetchApi('/api/generate-assets', { 
        prompt, 
        model: 'Nano Banana Pro', 
        referenceKeywords: referenceKeywords || [],
        flowUrl, 
        projectId, 
        fireAndForget: useHitlMode 
      });
      if (!data.fireAndForget) {
         setSceneLocationImages(p => ({ ...p, [sceneIndex]: data.url }));
      }
    } catch (e: any) {
      alert(`第 ${sceneIndex + 1} 幕自定义场景生图失败: ` + e.message);
    } finally {
      setProcessingScene(p => ({ ...p, [sceneIndex]: null }));
    }
  }, [sceneLocationPrompts, flowUrl, projectId, useHitlMode]);

  const handleGenerateCharacterPrompt = useCallback(async (index: number, sheetElements?: string) => {
    setProcessingChars(p => ({ ...p, [index]: 'prompt' }));
    try {
      const char = characters[index];
      const data = await fetchApi('/api/generate-prompts', { aiProvider,
          taskType: 'character_prompt',
          artStyle,
          fullScriptContext: getFullScriptContext(),
          characterName: char.name,
          characterDetails: char.persona,
          sheetElements: sheetElements || undefined,
      });
      setCharacterPrompts(prev => ({ ...prev, [index]: data.prompt }));
    } catch (e: any) {
      alert('提示词生成失败: ' + e.message);
    } finally {
      setProcessingChars(p => ({ ...p, [index]: null }));
    }
  }, [aiProvider, characters, artStyle, getFullScriptContext]);

  const generateCastingImage = useCallback(async (index: number) => {
    if (!characterPrompts[index]) return alert("请先生成或填写视觉提示词");
    setProcessingChars(p => ({ ...p, [index]: 'image' }));
    try {
      await fetch('/api/extension/active-context', { method: 'POST', body: JSON.stringify({ projectId, targetType: 'characterImage', index, meta: { charName: characters[index].name } }) });
      const data = await fetchApi('/api/generate-assets', { prompt: characterPrompts[index], model: 'Nano Banana Pro', flowUrl, projectId, fireAndForget: useHitlMode });
      if (!data.fireAndForget) {
         setCharacterImages(prev => ({ ...prev, [index]: data.url }));
      }
    } catch (e: any) {
      alert('定妆失败: ' + e.message);
    } finally {
      setProcessingChars(p => ({ ...p, [index]: null }));
    }
  }, [characters, characterPrompts, flowUrl, projectId, useHitlMode]);

  // ========================================
  // Phase 3 业务逻辑
  // ========================================

  const handleGenerateActionPrompt = useCallback(async (i: number) => {
    setProcessingScene(p => ({ ...p, [i]: 'action' }));
    try {
      const line = scriptLines[i];
      const allCharactersContext = characters.map(c => `${c.name}: ${c.persona}${c.voice ? ` | voice: ${c.voice}` : ''}`).join('\n');
      const previousImagePrompt = i > 0 ? sceneImagePrompts[i - 1] : "";
      const previousVideoPrompt = i > 0 ? sceneVideoPrompts[i - 1] : "";
      const activeLocationPrompt = sceneLocationPrompts[i] || locationPrompt || '';
      // 过滤掉场景描述里的布局标签，防止 AI 在写首尾帧提示词时，误把“环境布局”当成“站位布局”写进去
      const cleanLocationContext = activeLocationPrompt.replace(/\{@Layout_[^{}]+\}/g, '').trim();
      // 提取独立配置的人物站位 3D 布局标签（专门用于分镜控制人物）
      const extractLayoutKeyword = (p: string) => {
        const matches = p.matchAll(/\{@(Layout_[^{}]+)\}/g);
        const keywords = Array.from(matches, m => m[1]);
        return keywords.length > 0 ? keywords[0] : null;
      };
      const activeActionLayoutPrompt = actionLayoutPrompts[i] || '';
      const layoutTag = extractLayoutKeyword(activeActionLayoutPrompt);
      const baseSceneToken = sceneLocationPrompts[i] ? `场景_S${i}` : '场景';
      // 巧妙组合：如果配置了独立的人物站位布局，AI 将同时输出 {@Layout_动作} 和 {@场景_环境}
      const sceneLocationToken = layoutTag ? `${layoutTag}} 布局和 {@${baseSceneToken}` : baseSceneToken;

      const data = await fetchApi('/api/generate-prompts', { aiProvider,
          taskType: 'action',
          artStyle,
          fullScriptContext: getFullScriptContext(),
          allCharactersContext,
          actionHint: line.actionHint,
          dialogue: line.dialogue,
          sceneIndex: i,
          totalScenes: scriptLines.length,
          previousImagePrompt,
          previousVideoPrompt,
          sceneLocationContext: cleanLocationContext,
          sceneLocationToken
      });
      // 尾帧提示词（所有镜头都有）
      setSceneImagePrompts(p => ({ ...p, [i]: data.imagePrompt }));
      // 视频提示词
      setSceneVideoPrompts(p => ({ ...p, [i]: data.videoPrompt }));
      // 首帧提示词（仅第1镜）
      if (data.startImagePrompt) {
        setSceneStartImagePrompts(p => ({ ...p, [i]: data.startImagePrompt }));
      }
      if (data.characters_in_scene) {
        setSceneCharacters(p => ({ ...p, [i]: data.characters_in_scene }));
      }
    } catch (e: any) {
      alert('打磨视觉指令失败: ' + e.message);
    } finally {
      setProcessingScene(p => ({ ...p, [i]: null }));
    }
  }, [aiProvider, scriptLines, characters, artStyle, getFullScriptContext, sceneImagePrompts, sceneVideoPrompts, actionLayoutPrompts, sceneLocationPrompts, locationPrompt]);

  // ========================================
  // Cover 生成
  // ========================================
  const handleGenerateCoverPrompt = useCallback(async (ratio: string) => {
    setProcessingCovers(p => ({ ...p, [ratio]: 'prompt' }));
    try {
      // 提取核心物理角色做为 AI 理解剧情角色的依据
      const allCharactersContext = characters
          .filter(c => !['旁白', '字卡', '标题', '画外音', '系统'].some(sys => c.name.includes(sys)))
          .map(c => c.name)
          .join(', ');

      const data = await fetchApi('/api/generate-prompts', { aiProvider,
          taskType: 'cover_prompt',
          theme: '', 
          artStyle,
          fullScriptContext: getFullScriptContext(),
          allCharactersContext
      });
      setCoverPrompts(p => ({ ...p, [ratio]: data.prompt }));
    } catch (e: any) {
      alert(`生成[${ratio}]封面指令失败: ` + e.message);
    } finally {
      setProcessingCovers(p => ({ ...p, [ratio]: null }));
    }
  }, [aiProvider, publishInfo, artStyle, getFullScriptContext]);

  const handleGenerateCoverAsset = useCallback(async (ratio: string) => {
    setProcessingCovers(p => ({ ...p, [ratio]: 'image' }));
    try {
      const prompt = coverPrompts[ratio];
      if (!prompt) throw new Error("请先生成封面视觉提示词");

      // 提取剧集所有物理角色的引用参考图片进行绑定强化主角 (排除各种非实体人设)
      let refKeywords: string[] = characters
          .filter(c => !['旁白', '字卡', '标题', '画外音', '系统'].some(sys => c.name.includes(sys)))
          .map(c => c.name);

      await fetch('/api/extension/active-context', { method: 'POST', body: JSON.stringify({ projectId, targetType: 'coverImage', meta: { ratio } }) });
      // 用户承诺已经在网页上点击好了比例，如果你开启了 HITL 模式，我们就用 fireAndForget 让你自己选。否则我们就强行等第一张。
      const data = await fetchApi('/api/generate-assets', { prompt, model: 'Nano Banana Pro', referenceKeywords: refKeywords, flowUrl, projectId, fireAndForget: useHitlMode });
      
      // 如果没有使用 HITL，或者强行等到了图（非 HITL 模式），默认帮你贴第一张
      if (data.url && !useHitlMode) {
         setCoverImages(p => ({ ...p, [ratio]: data.url }));
      }
    } catch (e: any) {
      alert(`生成[${ratio}]生图失败: ` + e.message);
    } finally {
      setProcessingCovers(p => ({ ...p, [ratio]: null }));
    }
  }, [coverPrompts, characters, flowUrl, projectId]);

  /** 提取角色参考关键词的辅助函数 */
  const getRefKeywords = useCallback((i: number, prompt: string) => {
    const charsInScene = sceneCharacters[i] || [];
    let refKeywords: string[] = [];
    for (const cName of charsInScene) {
      const idx = characters.findIndex(c => c.name === cName);
      if (idx >= 0 && characters[idx] && !refKeywords.includes(characters[idx].name)) {
        refKeywords.push(characters[idx].name);
      }
    }
    if (refKeywords.length === 0) {
      const charIdx = characters.findIndex(c => c.name === scriptLines[i]?.speaker);
      if (charIdx >= 0 && characters[charIdx]) {
        refKeywords.push(characters[charIdx].name);
      }
    }
    const regex = /\{@([^{}]+)\}/g;
    let match;
    while ((match = regex.exec(prompt)) !== null) {
      const kw = match[1];
      if (!refKeywords.includes(kw)) {
        refKeywords.push(kw);
      }
    }
    return refKeywords;
  }, [sceneCharacters, characters, scriptLines]);

  /** 生成尾帧图（所有镜头） */
  const handleGenerateEndFrame = useCallback(async (i: number) => {
    setProcessingScene(p => ({ ...p, [i]: 'image' }));
    try {
      const prompt = sceneImagePrompts[i];
      if (!prompt) throw new Error("请先生成视觉提示词");
      const refKeywords = getRefKeywords(i, prompt);

      await fetch('/api/extension/active-context', { method: 'POST', body: JSON.stringify({ projectId, targetType: 'sceneImage', index: i }) });
      const data = await fetchApi('/api/generate-assets', { prompt, model: 'Nano Banana Pro', referenceKeywords: refKeywords, flowUrl, projectId, fireAndForget: useHitlMode });
      
      if (!data.fireAndForget) {
         setSceneImages(p => ({ ...p, [i]: data.url }));
      }
    } catch (e: any) {
      alert('生成尾帧失败: ' + e.message);
    } finally {
      setProcessingScene(p => ({ ...p, [i]: null }));
    }
  }, [sceneImagePrompts, getRefKeywords, flowUrl, projectId, useHitlMode]);

  /** 生成首帧图（仅第1镜需要手动生成，后续镜头自动继承前一镜尾帧） */
  const handleGenerateStartFrame = useCallback(async (i: number) => {
    setProcessingScene(p => ({ ...p, [i]: 'image' }));
    try {
      const prompt = sceneStartImagePrompts[i];
      if (!prompt) throw new Error("该镜头没有首帧提示词（仅第1镜需要生成首帧）");
      const refKeywords = getRefKeywords(i, prompt);

      await fetch('/api/extension/active-context', { method: 'POST', body: JSON.stringify({ projectId, targetType: 'sceneStartImage', index: i }) });
      const data = await fetchApi('/api/generate-assets', { prompt, model: 'Nano Banana Pro', referenceKeywords: refKeywords, flowUrl, projectId, fireAndForget: useHitlMode });
      
      if (!data.fireAndForget) {
         setSceneStartImages(p => ({ ...p, [i]: data.url }));
      }
    } catch (e: any) {
      alert('生成首帧失败: ' + e.message);
    } finally {
      setProcessingScene(p => ({ ...p, [i]: null }));
    }
  }, [sceneStartImagePrompts, getRefKeywords, flowUrl, projectId, useHitlMode]);

  const handleGenerateVideo = useCallback(async (i: number) => {
    setProcessingScene(p => ({ ...p, [i]: 'video' }));
    try {
      const videoPrompt = sceneVideoPrompts[i];
      const endImage = sceneImages[i];
      // 首帧: 第1镜用 sceneStartImages[0]，后续镜头用前一镜尾帧
      const startImage = i === 0 ? sceneStartImages[0] : sceneImages[i - 1];
      
      if (!videoPrompt) throw new Error("请确保有视频提示词！");
      if (!endImage) throw new Error("请确保有尾帧图！");
      if (!startImage) throw new Error(i === 0 ? "请生成第1镜的首帧图！" : "请确保上一镜已有尾帧图！");

      let prompt = videoPrompt.trim();
      
      // 首帧和尾帧的参考关键词（用于在 Flow 素材库中定位图片）
      let startRef = (sceneImageRefs as Record<string, string>)[`start_${i}`];
      if (!startRef) {
          if (i === 0) {
              startRef = getRefKeywords(0, sceneStartImagePrompts[0] || '')[0] || '场景';
          } else {
              startRef = sceneImageRefs[i - 1] || getRefKeywords(i - 1, sceneImagePrompts[i - 1] || '')[0] || '场景';
          }
      }
      const endRef = sceneImageRefs[i] || getRefKeywords(i, sceneImagePrompts[i] || '')[0] || '场景';

      await fetch('/api/extension/active-context', { method: 'POST', body: JSON.stringify({ projectId, targetType: 'sceneVideo', index: i }) });
      const data = await fetchApi('/api/generate-assets', { prompt, model: 'Veo 3.1', referenceKeywords: [startRef, endRef], flowUrl, projectId, fireAndForget: useHitlMode, veoMode: 'frame' });
      
      if (!data.fireAndForget) {
          setSceneVideos(p => ({ ...p, [i]: data.url }));
      }
    } catch (e: any) {
      alert('渲染视频失败: ' + e.message);
    } finally {
      setProcessingScene(p => ({ ...p, [i]: null }));
    }
  }, [sceneVideoPrompts, sceneImagePrompts, sceneStartImagePrompts, sceneImages, sceneStartImages, sceneImageRefs, flowUrl, projectId, useHitlMode]);

  const handleGenerateVoice = useCallback(async (i: number) => {
    setProcessingScene(p => ({ ...p, [i]: 'voice' }));
    try {
      const line = scriptLines[i];
      if (!line.dialogue) throw new Error("该幕没有台词，无法配音！");

      const charConfig = characters.find(c => c.name === line.speaker);
      const voiceName = charConfig?.voiceName || "Zephyr";

      const data = await fetchApi('/api/generate-voice', { dialogue: line.dialogue, voiceName, projectId });
      setSceneAudio(p => ({ ...p, [i]: data.audioUrl }));
    } catch (e: any) {
      alert('配置音频失败: ' + e.message);
    } finally {
      setProcessingScene(p => ({ ...p, [i]: null }));
    }
  }, [scriptLines, characters, projectId]);

  // ========================================
  // 全局操作
  // ========================================

  const handleClearProgress = useCallback(() => {
    if (!confirm("确定要撕毁当前剧本并清空脑洞吗？")) return;
    setTheme("");
    setCharacters([]);
    setScriptLines([]);
    setCurrentPhase(1);
    // v2 清空
    setWriterStep(1);
    setInspirations([]);
    setCreativeMode('reference');
    setRawScript("");
    setScriptReview(null);
    setScriptIteration(0);
    setUserDirection("");
    setLocationPrompt("");
    setLocationImage("");
    setCharacterPrompts({});
    setCharacterImages({});
    setActiveSceneIndex(0);
    setSceneImagePrompts({});
    setSceneVideoPrompts({});
    setSceneStartImagePrompts({});
    setSceneCharacters({});
    setSceneDurations({});
    setSceneImages({});
    setSceneStartImages({});
    setSceneImageRefs({});
    setSceneVideos({});
    setSceneAudio({});
    setSceneAudioDelays({});
  }, []);

  // ========================================
  // Context Value
  // ========================================

  const value: ProjectContextValue = {
    projectId,
    currentPhase, setCurrentPhase,
    artStyle, setArtStyle,
    useHitlMode, setUseHitlMode, // <-- exported 
    aiProvider, setAiProvider,
    flowUrl, setFlowUrl,
    theme, setTheme,
    isBrainstorming,
    characters, setCharacters,
    scriptLines, setScriptLines,
    handleBrainstormDirectly,
    updateCharacter, updateScriptLine,
    addCharacter, removeCharacter,
    addScriptLine, removeScriptLine, moveScriptLine,
    // v2 三步流水线
    writerStep, setWriterStep,
    inspirations, setInspirations,
    creativeMode, setCreativeMode,
    rawScript, setRawScript,
    scriptReview, setScriptReview,
    scriptIteration,
    isGeneratingScript, isIteratingScript, isReviewingScript, isSplittingScript, isFetchingReddit,
    userDirection, setUserDirection,
    handleFetchRedditJokes, handleGenerateScript, handleIterateScript, handleReviewScript, handleScriptToScenes,
    handleAddManualInspiration, handleRemoveInspiration, handleSelectInspiration,
    characterPrompts, setCharacterPrompts,
    characterImages, setCharacterImages,
    processingChars,
    handleGenerateCharacterPrompt, generateCastingImage,
    locationPrompt, setLocationPrompt,
    locationImage, setLocationImage,
    isProcessingLocation, setIsProcessingLocation,
    handleGenerateLocationPrompt, generateLocationImage,
    activeSceneIndex, setActiveSceneIndex,
    sceneLocationPrompts, setSceneLocationPrompts,
    sceneLocationImages, setSceneLocationImages,
    actionLayoutPrompts, setActionLayoutPrompts,
    handleGenerateSceneLocationPrompt, generateSceneLocationImage,
    sceneImagePrompts, setSceneImagePrompts,
    sceneVideoPrompts, setSceneVideoPrompts,
    sceneStartImagePrompts, setSceneStartImagePrompts,
    sceneDurations, setSceneDurations,
    sceneVideoTrimStart, setSceneVideoTrimStart,
    sceneVideoTrimEnd, setSceneVideoTrimEnd,
    sceneImages, setSceneImages,
    sceneStartImages, setSceneStartImages,
    sceneImageRefs, setSceneImageRefs,
    sceneVideos, setSceneVideos,
    sceneAudio, setSceneAudio,
    sceneAudioDelays, setSceneAudioDelays,
    currentVideoTimes, setCurrentVideoTimes,
    sceneCharacters, setSceneCharacters,
    processingScene, setProcessingScene,
    handleGenerateActionPrompt, handleGenerateEndFrame, handleGenerateStartFrame,
    handleGenerateVideo, handleGenerateVoice,
    publishInfo, setPublishInfo,
    coverPrompts, setCoverPrompts,
    coverImages, setCoverImages,
    processingCovers, setProcessingCovers,
    handleGenerateCoverPrompt, handleGenerateCoverAsset,
    handleClearProgress, getFullScriptContext,
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
