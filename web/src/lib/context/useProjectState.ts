import { useState, useEffect, useRef } from 'react';
import type { PublishInfo } from '../types';
import { bustUrlCache, bustUrlCacheMap } from '../assetUrl';
import { useProjectStore } from '../store/useProjectStore';
import { DEFAULT_ART_STYLE } from '../constants';

export function useProjectState(projectId: string) {
  // Sync projectId to Zustand
  useEffect(() => {
    useProjectStore.getState().setProjectId(projectId);
  }, [projectId]);

  // Phase 控制 (仍然保留在 Context 中作为轻量级状态，或者以后迁移)
  const [currentPhase, setCurrentPhase] = useState(1);

  // Phase 1 v2: 三步流水线
  const [publishInfo, setPublishInfo] = useState<PublishInfo>();

  const stateLoaded = useRef(false);

  // 自动加载 (从 API)
  useEffect(() => {
    fetch(`/api/state?projectId=${encodeURIComponent(projectId)}`).then(r => r.json()).then(res => {
      if (res.success && Object.keys(res.data).length > 0) {
        const data = res.data;
        
        // Hydrate Zustand store
        useProjectStore.getState().hydrateGlobalSettings({
          artStyle: data.artStyle || DEFAULT_ART_STYLE,
          flowUrl: data.flowUrl || '',
          aiProvider: data.aiProvider || 'gemini',
          useHitlMode: data.useHitlMode !== undefined ? data.useHitlMode : true,
        });

        // Hydrate Writer Room Settings
        useProjectStore.getState().hydrateWriterRoomSettings({
          theme: data.theme || "",
          characters: data.characters || [],
          scriptLines: data.scriptLines || [],
          writerStep: data.writerStep || 1,
          inspirations: data.inspirations || [],
          creativeMode: data.creativeMode || 'reference',
          rawScript: data.rawScript || "",
          scriptReview: data.scriptReview || null,
          scriptIteration: data.scriptIteration || 0,
          userDirection: data.userDirection || "",
        });

        // Hydrate Casting Room & Storyboard Media Settings
        useProjectStore.getState().hydrateMediaSettings({
          locationPrompt: data.locationPrompt || "",
          locationImage: data.locationImage ? bustUrlCache(data.locationImage) : "",
          characterPrompts: data.characterPrompts || {},
          characterImages: data.characterImages ? bustUrlCacheMap(data.characterImages) : {},
          activeSceneIndex: data.activeSceneIndex || 0,
          sceneLocationPrompts: data.sceneLocationPrompts || {},
          sceneLocationImages: data.sceneLocationImages ? bustUrlCacheMap(data.sceneLocationImages) : {},
          startLayoutPrompts: data.startLayoutPrompts || {},
          endLayoutPrompts: data.endLayoutPrompts || {},
          sceneImagePrompts: data.sceneImagePrompts || data.sceneVisualPrompts || {},
          sceneVideoPrompts: data.sceneVideoPrompts || data.sceneCameraPrompts || {},
          sceneStartImagePrompts: data.sceneStartImagePrompts || {},
          sceneCharacters: data.sceneCharacters || {},
          sceneDurations: data.sceneDurations || {},
          sceneVideoTrimStart: data.sceneVideoTrimStart || {},
          sceneVideoTrimEnd: data.sceneVideoTrimEnd || {},
          sceneImages: data.sceneImages ? bustUrlCacheMap(data.sceneImages) : {},
          sceneStartImages: data.sceneStartImages ? bustUrlCacheMap(data.sceneStartImages) : {},
          sceneImageRefs: data.sceneImageRefs || {},
          sceneVideos: data.sceneVideos ? bustUrlCacheMap(data.sceneVideos) : {},
          sceneAudio: data.sceneAudio ? bustUrlCacheMap(data.sceneAudio) : {},
          sceneAudioDelays: data.sceneAudioDelays || {},
          coverPrompts: data.coverPrompts || {},
          coverImages: data.coverImages ? bustUrlCacheMap(data.coverImages) : {},
        });

        if (data.currentPhase) setCurrentPhase(data.currentPhase);
        if (data.publishInfo) setPublishInfo(data.publishInfo);
      }
      stateLoaded.current = true;
    }).catch(e => {
      console.error("Failed to load state", e);
      stateLoaded.current = true;
    });
  }, [projectId]);

  // 自动保存 Context 里的遗留字段 (currentPhase, publishInfo)
  const prevStateRef = useRef<any>(null);

  useEffect(() => {
    if (!stateLoaded.current) return;
    const data = { projectId, currentPhase, publishInfo };

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
        fetch(`/api/state?projectId=${encodeURIComponent(projectId)}`, { 
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(diff) 
        }).catch(e => console.error("Save state error:", e));
        prevStateRef.current = data;
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [projectId, currentPhase, publishInfo]);

  // 工具函数：清除进度
  const handleClearProgress = () => {
    if (confirm("Are you sure to clear all progress? This cannot be undone.")) {
      fetch(`/api/state?projectId=${encodeURIComponent(projectId)}`, { method: 'DELETE' }).then(() => {
        window.location.reload();
      });
    }
  };

  return {
    projectId, currentPhase, setCurrentPhase,
    publishInfo, setPublishInfo,
    handleClearProgress
  };
}

/** useProjectState 返回值的类型，供其他 hooks 用 Pick<> 精确声明依赖 */
export type ProjectStateReturn = ReturnType<typeof useProjectState>;

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
