import { useCallback } from 'react';
import { fetchApi } from './useProjectState';

export function useCastingRoom(state: any, getFullScriptContext: () => string) {
  const {
    projectId,
    aiProvider,
    artStyle,
    flowUrl,
    useHitlMode,
    locationPrompt, setLocationPrompt,
    setLocationImage,
    setIsProcessingLocation,
    characters,
    characterPrompts, setCharacterPrompts,
    setCharacterImages,
    setProcessingChars,
    sceneLocationPrompts, setSceneLocationPrompts,
    setSceneLocationImages,
    setProcessingScene,
  } = state;

  const handleGenerateLocationPrompt = useCallback(async (sceneComposition?: string) => {
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
      alert('场景提示词生成失败: ' + e.message);
    } finally {
      setIsProcessingLocation(null);
    }
  }, [aiProvider, artStyle, getFullScriptContext, setLocationPrompt, setIsProcessingLocation]);

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
        fireAndForget: useHitlMode,
        targetType: 'locationImage'
      });
      if (!data.fireAndForget) {
         setLocationImage(data.url);
      }
    } catch (e: any) {
      alert('场景生图失败: ' + e.message);
    } finally {
      setIsProcessingLocation(null);
    }
  }, [locationPrompt, flowUrl, projectId, useHitlMode, setLocationImage, setIsProcessingLocation]);

  const handleGenerateSceneLocationPrompt = useCallback(async (sceneIndex: number, sceneComposition?: string) => {
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
      alert(`第 ${sceneIndex + 1} 幕自定义场景提示词生成失败: ` + e.message);
    } finally {
      setProcessingScene((p: any) => ({ ...p, [sceneIndex]: null }));
    }
  }, [aiProvider, artStyle, getFullScriptContext, setProcessingScene, setSceneLocationPrompts]);

  const generateSceneLocationImage = useCallback(async (sceneIndex: number, referenceKeywords?: string[]) => {
    const prompt = sceneLocationPrompts[sceneIndex];
    if (!prompt) return alert("请先生成该幕场景视觉提示词");
    setProcessingScene((p: any) => ({ ...p, [sceneIndex]: 'action' }));
    try {
      await fetch('/api/extension/active-context', { method: 'POST', body: JSON.stringify({ projectId, targetType: 'sceneLocationImage', index: sceneIndex }) });
      const data = await fetchApi('/api/generate-assets', { 
        prompt, 
        model: 'Nano Banana Pro', 
        referenceKeywords: referenceKeywords || [],
        flowUrl, 
        projectId, 
        fireAndForget: useHitlMode,
        targetType: 'sceneLocationImage',
        index: sceneIndex
      });
      if (!data.fireAndForget) {
         setSceneLocationImages((p: any) => ({ ...p, [sceneIndex]: data.url }));
      }
    } catch (e: any) {
      alert(`第 ${sceneIndex + 1} 幕自定义场景生图失败: ` + e.message);
    } finally {
      setProcessingScene((p: any) => ({ ...p, [sceneIndex]: null }));
    }
  }, [sceneLocationPrompts, flowUrl, projectId, useHitlMode, setProcessingScene, setSceneLocationImages]);

  const handleGenerateCharacterPrompt = useCallback(async (index: number, sheetElements?: string) => {
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
      alert('提示词生成失败: ' + e.message);
    } finally {
      setProcessingChars((p: any) => ({ ...p, [index]: null }));
    }
  }, [aiProvider, characters, artStyle, getFullScriptContext, setProcessingChars, setCharacterPrompts]);

  const generateCastingImage = useCallback(async (index: number) => {
    if (!characterPrompts[index]) return alert("请先生成或填写视觉提示词");
    setProcessingChars((p: any) => ({ ...p, [index]: 'image' }));
    try {
      await fetch('/api/extension/active-context', { method: 'POST', body: JSON.stringify({ projectId, targetType: 'characterImage', index, meta: { charName: characters[index].name } }) });
      const data = await fetchApi('/api/generate-assets', { prompt: characterPrompts[index], model: 'Nano Banana Pro', flowUrl, projectId, fireAndForget: useHitlMode, targetType: 'characterImage', index, meta: { charName: characters[index].name } });
      if (!data.fireAndForget) {
         setCharacterImages((prev: any) => ({ ...prev, [index]: data.url }));
      }
    } catch (e: any) {
      alert('定妆失败: ' + e.message);
    } finally {
      setProcessingChars((p: any) => ({ ...p, [index]: null }));
    }
  }, [characters, characterPrompts, flowUrl, projectId, useHitlMode, setProcessingChars, setCharacterImages]);

  return {
    handleGenerateLocationPrompt,
    generateLocationImage,
    handleGenerateSceneLocationPrompt,
    generateSceneLocationImage,
    handleGenerateCharacterPrompt,
    generateCastingImage
  };
}
