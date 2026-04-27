import { useCallback } from 'react';
import { fetchApi } from './useProjectState';
import { toast } from '../toast';
import { useProjectStore } from '../store/useProjectStore';

export function useCastingRoom(getFullScriptContext: () => string) {
  const handleGenerateLocationPrompt = useCallback(async (sceneComposition?: string) => {
    const { aiProvider, artStyle, setLocationPrompt, setIsProcessingLocation } = useProjectStore.getState();
    setIsProcessingLocation('prompt');
    try {
      const data = await fetchApi('/api/generate-prompts', {
        aiProvider,
        taskType: 'location_prompt',
        artStyle,
        fullScriptContext: getFullScriptContext(),
        sceneComposition: sceneComposition || undefined,
      });
      setLocationPrompt(data.prompt);
    } catch (e: any) {
      toast.error('场景提示词生成失败: ' + e.message);
    } finally {
      setIsProcessingLocation(null);
    }
  }, [getFullScriptContext]);

  const generateLocationImage = useCallback(async (referenceKeywords?: string[]) => {
    const { locationPrompt, projectId, flowUrl, setLocationImage, setIsProcessingLocation } = useProjectStore.getState();
    if (!locationPrompt) return toast.warning("请先生成场景视觉提示词");
    setIsProcessingLocation('image');
    try {
      const data = await fetchApi('/api/generate-assets', { 
        prompt: locationPrompt, 
        model: 'Nano Banana Pro', 
        referenceKeywords: referenceKeywords || [],
        flowUrl, 
        projectId, 
        targetType: 'locationImage'
      });
      if (data.url) {
         setLocationImage(data.url);
      }
    } catch (e: any) {
      toast.error('场景生图失败: ' + e.message);
    } finally {
      setIsProcessingLocation(null);
    }
  }, []);

  const handleGenerateSceneLocationPrompt = useCallback(async (sceneIndex: number, sceneComposition?: string) => {
    const { aiProvider, artStyle, setProcessingScene, setSceneLocationPrompts } = useProjectStore.getState();
    setProcessingScene((p: any) => ({ ...p, [sceneIndex]: 'action' }));
    try {
      const data = await fetchApi('/api/generate-prompts', {
        aiProvider,
        taskType: 'location_prompt',
        artStyle,
        fullScriptContext: getFullScriptContext(),
        sceneComposition: sceneComposition || undefined,
      });
      setSceneLocationPrompts((p: any) => ({ ...p, [sceneIndex]: data.prompt }));
    } catch (e: any) {
      toast.error(`第 ${sceneIndex + 1} 幕自定义场景提示词生成失败: ` + e.message);
    } finally {
      setProcessingScene((p: any) => ({ ...p, [sceneIndex]: null }));
    }
  }, [getFullScriptContext]);

  const generateSceneLocationImage = useCallback(async (sceneIndex: number, referenceKeywords?: string[]) => {
    const { sceneLocationPrompts, projectId, flowUrl, setProcessingScene, setSceneLocationImages } = useProjectStore.getState();
    const prompt = sceneLocationPrompts[sceneIndex];
    if (!prompt) return toast.warning("请先生成该幕场景视觉提示词");
    setProcessingScene((p: any) => ({ ...p, [sceneIndex]: 'action' }));
    try {
      const data = await fetchApi('/api/generate-assets', { 
        prompt, 
        model: 'Nano Banana Pro', 
        referenceKeywords: referenceKeywords || [],
        flowUrl, 
        projectId, 
        targetType: 'sceneLocationImage',
        index: sceneIndex
      });
      if (data.url) {
         setSceneLocationImages((p: any) => ({ ...p, [sceneIndex]: data.url }));
      }
    } catch (e: any) {
      toast.error(`第 ${sceneIndex + 1} 幕自定义场景生图失败: ` + e.message);
    } finally {
      setProcessingScene((p: any) => ({ ...p, [sceneIndex]: null }));
    }
  }, []);

  const handleGenerateCharacterPrompt = useCallback(async (index: number, sheetElements?: string) => {
    const { aiProvider, artStyle, characters, setProcessingChars, setCharacterPrompts } = useProjectStore.getState();
    setProcessingChars((p: any) => ({ ...p, [index]: 'prompt' }));
    try {
      const char = characters[index];
      const data = await fetchApi('/api/generate-prompts', {
        aiProvider,
        taskType: 'character_prompt',
        artStyle,
        fullScriptContext: getFullScriptContext(),
        characterName: char.name,
        characterDetails: char.persona,
        sheetElements: sheetElements || undefined,
      });
      setCharacterPrompts((prev: any) => ({ ...prev, [index]: data.prompt }));
    } catch (e: any) {
      toast.error('提示词生成失败: ' + e.message);
    } finally {
      setProcessingChars((p: any) => ({ ...p, [index]: null }));
    }
  }, [getFullScriptContext]);

  const generateCastingImage = useCallback(async (index: number) => {
    const { characterPrompts, projectId, flowUrl, characters, setProcessingChars, setCharacterImages } = useProjectStore.getState();
    if (!characterPrompts[index]) return toast.warning("请先生成或填写视觉提示词");
    setProcessingChars((p: any) => ({ ...p, [index]: 'image' }));
    try {
      const data = await fetchApi('/api/generate-assets', { prompt: characterPrompts[index], model: 'Nano Banana Pro', flowUrl, projectId, targetType: 'characterImage', index, meta: { charName: characters[index].name } });
      if (data.url) {
         setCharacterImages((prev: any) => ({ ...prev, [index]: data.url }));
      }
    } catch (e: any) {
      toast.error('定妆失败: ' + e.message);
    } finally {
      setProcessingChars((p: any) => ({ ...p, [index]: null }));
    }
  }, []);

  return {
    handleGenerateLocationPrompt,
    generateLocationImage,
    handleGenerateSceneLocationPrompt,
    generateSceneLocationImage,
    handleGenerateCharacterPrompt,
    generateCastingImage
  };
}
