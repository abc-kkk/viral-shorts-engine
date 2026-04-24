import { useState, useEffect, useRef } from 'react';
import type { Character, ScriptLine, InspirationItem, ScriptReview, CreativeMode, PublishInfo } from '../types';
import { bustUrlCache, bustUrlCacheMap } from '../assetUrl';
import { DEFAULT_ART_STYLE } from '../constants';

export function useProjectState(projectId: string) {
  // Phase 控制
  const [currentPhase, setCurrentPhase] = useState(1);

  // 全局设置
  const [artStyle, setArtStyle] = useState(DEFAULT_ART_STYLE);
  const [flowUrl, setFlowUrl] = useState("");
  const [aiProvider, setAiProvider] = useState<'gemini' | 'doubao'>('gemini');
  const [useHitlMode, setUseHitlMode] = useState(true);

  // Phase 1: 剧本室
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

  // 自动加载 (从 API)
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
        if (data.publishInfo) setPublishInfo(data.publishInfo);
        if (data.writerStep) setWriterStep(data.writerStep);
        if (data.inspirations) setInspirations(data.inspirations);
        if (data.creativeMode) setCreativeMode(data.creativeMode);
        if (data.rawScript) setRawScript(data.rawScript);
        if (data.scriptReview) setScriptReview(data.scriptReview);
        if (data.scriptIteration) setScriptIteration(data.scriptIteration);
        if (data.userDirection) setUserDirection(data.userDirection);
        if (data.locationPrompt) setLocationPrompt(data.locationPrompt);
        if (data.locationImage) setLocationImage(bustUrlCache(data.locationImage));
        if (data.characterPrompts) setCharacterPrompts(data.characterPrompts);
        if (data.characterImages) setCharacterImages(bustUrlCacheMap(data.characterImages));
        if (data.activeSceneIndex !== undefined) setActiveSceneIndex(data.activeSceneIndex);
        if (data.sceneLocationPrompts) setSceneLocationPrompts(data.sceneLocationPrompts);
        if (data.sceneLocationImages) setSceneLocationImages(bustUrlCacheMap(data.sceneLocationImages));
        if (data.sceneImagePrompts) setSceneImagePrompts(data.sceneImagePrompts);
        if (data.sceneVideoPrompts) setSceneVideoPrompts(data.sceneVideoPrompts);
        if (data.sceneStartImagePrompts) setSceneStartImagePrompts(data.sceneStartImagePrompts);
        if (data.sceneVisualPrompts) setSceneImagePrompts(data.sceneVisualPrompts);
        if (data.sceneCameraPrompts) setSceneVideoPrompts(data.sceneCameraPrompts);
        if (data.sceneCharacters) setSceneCharacters(data.sceneCharacters);
        if (data.sceneDurations) setSceneDurations(data.sceneDurations);
        if (data.sceneVideoTrimStart) setSceneVideoTrimStart(data.sceneVideoTrimStart);
        if (data.sceneVideoTrimEnd) setSceneVideoTrimEnd(data.sceneVideoTrimEnd);
        if (data.sceneImages) setSceneImages(bustUrlCacheMap(data.sceneImages));
        if (data.sceneStartImages) setSceneStartImages(bustUrlCacheMap(data.sceneStartImages));
        if (data.sceneImageRefs) setSceneImageRefs(data.sceneImageRefs);
        if (data.sceneVideos) setSceneVideos(bustUrlCacheMap(data.sceneVideos));
        if (data.sceneAudio) setSceneAudio(bustUrlCacheMap(data.sceneAudio));
        if (data.sceneAudioDelays) setSceneAudioDelays(data.sceneAudioDelays);
        if (data.coverPrompts) setCoverPrompts(data.coverPrompts);
        if (data.coverImages) setCoverImages(bustUrlCacheMap(data.coverImages));
      }
      stateLoaded.current = true;
    }).catch(e => {
      console.error("Failed to load state", e);
      stateLoaded.current = true;
    });
  }, [projectId]);

  // 自动保存 (debounce 1s) - 发送 diff
  const prevStateRef = useRef<any>(null);

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

    if (!prevStateRef.current) {
      prevStateRef.current = data;
      return;
    }

    const diff: any = {};
    let hasChanges = false;
    for (const key of Object.keys(data)) {
      if (JSON.stringify((data as any)[key]) !== JSON.stringify((prevStateRef.current as any)[key])) {
        diff[key] = (data as any)[key];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      const timeout = setTimeout(() => {
        fetch(`/api/state?projectId=${encodeURIComponent(projectId)}`, { method: 'PATCH', body: JSON.stringify(diff) })
          .catch(e => console.error("Save state error:", e));
        prevStateRef.current = data;
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [projectId, theme, flowUrl, artStyle, aiProvider, characters, scriptLines, currentPhase,
    publishInfo, coverPrompts, coverImages,
    writerStep, inspirations, creativeMode, rawScript, scriptReview, scriptIteration, userDirection,
    locationPrompt, locationImage, characterPrompts, characterImages, activeSceneIndex,
    sceneLocationPrompts, sceneLocationImages,
    sceneImagePrompts, sceneVideoPrompts, sceneStartImagePrompts, sceneCharacters,
    sceneDurations, sceneVideoTrimStart, sceneVideoTrimEnd, sceneImages, sceneStartImages, sceneImageRefs, sceneVideos, sceneAudio, sceneAudioDelays]);

  // 工具函数：清除进度
  const handleClearProgress = () => {
    if (confirm("Are you sure to clear all progress? This cannot be undone.")) {
      fetch(`/api/state?projectId=${encodeURIComponent(projectId)}`, { method: 'DELETE' }).then(() => {
        window.location.reload();
      });
    }
  };

  return {
    projectId, currentPhase, setCurrentPhase, artStyle, setArtStyle, flowUrl, setFlowUrl, aiProvider, setAiProvider, useHitlMode, setUseHitlMode,
    theme, setTheme, isBrainstorming, setIsBrainstorming, characters, setCharacters, scriptLines, setScriptLines,
    publishInfo, setPublishInfo, writerStep, setWriterStep, inspirations, setInspirations, creativeMode, setCreativeMode, rawScript, setRawScript,
    scriptReview, setScriptReview, scriptIteration, setScriptIteration, isGeneratingScript, setIsGeneratingScript, isIteratingScript, setIsIteratingScript,
    isReviewingScript, setIsReviewingScript, isSplittingScript, setIsSplittingScript, isFetchingReddit, setIsFetchingReddit, userDirection, setUserDirection,
    locationPrompt, setLocationPrompt, locationImage, setLocationImage, isProcessingLocation, setIsProcessingLocation, characterPrompts, setCharacterPrompts,
    characterImages, setCharacterImages, processingChars, setProcessingChars,
    activeSceneIndex, setActiveSceneIndex, sceneLocationPrompts, setSceneLocationPrompts, sceneLocationImages, setSceneLocationImages,
    actionLayoutPrompts, setActionLayoutPrompts, sceneImagePrompts, setSceneImagePrompts, sceneVideoPrompts, setSceneVideoPrompts, sceneStartImagePrompts, setSceneStartImagePrompts,
    sceneDurations, setSceneDurations, sceneVideoTrimStart, setSceneVideoTrimStart, sceneVideoTrimEnd, setSceneVideoTrimEnd, sceneImages, setSceneImages,
    sceneStartImages, setSceneStartImages, sceneImageRefs, setSceneImageRefs, sceneVideos, setSceneVideos, sceneAudio, setSceneAudio, sceneAudioDelays, setSceneAudioDelays,
    currentVideoTimes, setCurrentVideoTimes, sceneCharacters, setSceneCharacters, processingScene, setProcessingScene,
    coverPrompts, setCoverPrompts, coverImages, setCoverImages, processingCovers, setProcessingCovers,
    handleClearProgress
  };
}

/** 通用 API 请求脚手架：收敛所有的 POST 请求参数与错误处理 */
export async function fetchApi<T = any>(endpoint: string, payload: any): Promise<T> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}
