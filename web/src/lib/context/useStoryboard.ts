import { useCallback } from 'react';
import { fetchApi } from './useProjectState';
import type { Character } from '../types';
import { toast } from '../toast';
import { useProjectStore } from '../store/useProjectStore';
import { extractRefKeywords } from '../utils/promptParser';
import { apiClient } from '../utils/apiClient';

export function useStoryboard(getFullScriptContext: () => string) {
  const handleGenerateActionPrompt = useCallback(async (i: number) => {
    const { 
      aiProvider, artStyle, scriptLines, characters, sceneCharacters, sceneLocationPrompts, locationPrompt,
      startLayoutPrompts, endLayoutPrompts, sceneImagePrompts, sceneVideoPrompts,
      setProcessingScene, setSceneImagePrompts, setSceneVideoPrompts, setSceneStartImagePrompts, setSceneCharacters 
    } = useProjectStore.getState();

    setProcessingScene((p: any) => ({ ...p, [i]: 'action' }));
    
    try {
      const line = scriptLines[i];
      const selectedChars = sceneCharacters[i] || [];
      const allCharactersContext = characters.filter((c: Character) => selectedChars.includes(c.name)).map((c: Character) => `${c.name}: ${c.persona}${c.voiceName ? ` | voice: ${c.voiceName}` : ''}`).join('\n');
      const previousImagePrompt = i > 0 ? sceneImagePrompts[i - 1] : "";
      const previousVideoPrompt = i > 0 ? sceneVideoPrompts[i - 1] : "";
      const activeLocationPrompt = sceneLocationPrompts[i] || locationPrompt || '';
      
      let cleanLocationContext = activeLocationPrompt;
      let sceneLocationToken = sceneLocationPrompts[i] ? `场景_S${i}` : '场景';
      
      let startLayoutToken = '';
      const startTagMatch = (startLayoutPrompts[i] || '').match(/\{@(Layout_[^{}]+)\}/);
      if (startTagMatch) startLayoutToken = startTagMatch[1];
      
      let endLayoutToken = '';
      const endTagMatch = (endLayoutPrompts[i] || '').match(/\{@(Layout_[^{}]+)\}/);
      if (endTagMatch) endLayoutToken = endTagMatch[1];
      
      cleanLocationContext = activeLocationPrompt.replace(/\{@([^{}]+)\}/g, '').trim();

      const data = await fetchApi('/api/generate-prompts', {
          aiProvider,
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
          sceneLocationToken,
          startLayoutToken,
          endLayoutToken
      });
      
      setSceneImagePrompts((p: any) => ({ ...p, [i]: data.imagePrompt }));
      setSceneVideoPrompts((p: any) => ({ ...p, [i]: data.videoPrompt }));
      if (data.startImagePrompt) {
        setSceneStartImagePrompts((p: any) => ({ ...p, [i]: data.startImagePrompt }));
      }
      if (data.characters_in_scene) {
        setSceneCharacters((p: any) => ({ ...p, [i]: data.characters_in_scene }));
      }
    } catch (e: any) {
      toast.error('动作提示词生成失败: ' + e.message);
    } finally {
      setProcessingScene((p: any) => ({ ...p, [i]: null }));
    }
  }, [getFullScriptContext]);

  const getRefKeywords = useCallback((i: number, prompt: string) => {
    const { characters, scriptLines, sceneCharacters } = useProjectStore.getState();
    const charsInScene = sceneCharacters[i] || [];
    let refKeywords: string[] = [];
    for (const cName of charsInScene) {
      const idx = characters.findIndex((c: Character) => c.name === cName);
      if (idx >= 0 && characters[idx] && !refKeywords.includes(characters[idx].name)) {
        refKeywords.push(characters[idx].name);
      }
    }
    if (refKeywords.length === 0) {
      const charIdx = characters.findIndex((c: Character) => c.name === scriptLines[i]?.speaker);
      if (charIdx >= 0 && characters[charIdx]) {
        refKeywords.push(characters[charIdx].name);
      }
    }
    const extracted = extractRefKeywords(prompt);
    for (const kw of extracted) {
      if (!refKeywords.includes(kw)) {
        refKeywords.push(kw);
      }
    }
    return refKeywords;
  }, []);

  const generateSceneImageCore = useCallback(async (i: number, type: 'startImage' | 'image', promptObj: Record<number, string>, setObj: any) => {
    const promptText = promptObj[i];
    if (!promptText) return toast.warning("请先生成或填写视觉提示词");
    const { flowUrl, startLayoutPrompts, endLayoutPrompts, projectId, setProcessingScene } = useProjectStore.getState();
    setProcessingScene((p: any) => ({ ...p, [i]: type }));
    
    try {
      const layoutTag = (type === 'startImage' ? startLayoutPrompts[i] : endLayoutPrompts[i]) || '';
      const prompt = promptText + (layoutTag ? ` ${layoutTag}` : '');
      const refKeywords = getRefKeywords(i, prompt);
      const data = await fetchApi('/api/generate-assets', { prompt, model: 'Nano Banana Pro', referenceKeywords: refKeywords, flowUrl, projectId, targetType: type === 'startImage' ? 'sceneStartImage' : 'sceneImage', index: i });
      
      if (data.url) {
         setObj((p: any) => ({ ...p, [i]: data.url }));
      }
    } catch (e: any) {
      toast.error(`生成${type === 'startImage' ? '首' : '尾'}帧失败: ` + e.message);
    } finally {
      useProjectStore.getState().setProcessingScene((p: any) => ({ ...p, [i]: null }));
    }
  }, [getRefKeywords]);

  const handleGenerateEndFrame = useCallback((i: number) => {
    const { sceneImagePrompts, setSceneImages } = useProjectStore.getState();
    return generateSceneImageCore(i, 'image', sceneImagePrompts, setSceneImages);
  }, [generateSceneImageCore]);

  const handleGenerateStartFrame = useCallback((i: number) => {
    const { sceneStartImagePrompts, setSceneStartImages } = useProjectStore.getState();
    return generateSceneImageCore(i, 'startImage', sceneStartImagePrompts, setSceneStartImages);
  }, [generateSceneImageCore]);

  const handleGenerateVideo = useCallback(async (i: number) => {
    const { flowUrl, scriptLines, sceneVideoPrompts, sceneStartImages, sceneImages, projectId, setProcessingScene, setSceneVideos } = useProjectStore.getState();

    if (!sceneVideoPrompts[i]) return toast.warning("请先生成或填写视频运动提示词");
    
    setProcessingScene((p: any) => ({ ...p, [i]: 'video' }));

    try {
      let prompt = sceneVideoPrompts[i].trim();

      // 使用最新的首帧和尾帧 URL（而不是旧的 sceneImageRefs）
      const startImageUrl = sceneStartImages[i] || '';
      const endImageUrl = sceneImages[i] || '';

      const referenceKeywords: string[] = [];
      if (startImageUrl) referenceKeywords.push(startImageUrl);
      if (endImageUrl) referenceKeywords.push(endImageUrl);

      if (referenceKeywords.length === 0) {
        toast.warning("请先生成首帧和尾帧图片");
        setProcessingScene((p: any) => ({ ...p, [i]: null }));
        return;
      }

      console.log(`[Video] Using start: ${startImageUrl ? '✅' : '❌'}, end: ${endImageUrl ? '✅' : '❌'}`);
      
      const data = await fetchApi('/api/generate-assets', { prompt, model: 'Veo 3.1', referenceKeywords, flowUrl, projectId, veoMode: 'frame', targetType: 'sceneVideo', index: i });
      
      if (data.url) {
          setSceneVideos((p: any) => ({ ...p, [i]: data.url }));
      }
    } catch (e: any) {
      toast.error('渲染视频失败: ' + e.message);
    } finally {
      useProjectStore.getState().setProcessingScene((p: any) => ({ ...p, [i]: null }));
    }
  }, []);

  const handleGenerateVoice = useCallback(async (i: number) => {
    const { scriptLines, characters, projectId, setProcessingScene, setSceneAudio } = useProjectStore.getState();
    setProcessingScene((p: any) => ({ ...p, [i]: 'voice' }));
    try {
      const line = scriptLines[i];
      if (!line.dialogue) throw new Error("该幕没有台词，无法配音！");

      const charConfig = characters.find((c: Character) => c.name === line.speaker);
      const voiceName = charConfig?.voiceName || "Zephyr";

      const data = await fetchApi('/api/generate-voice', { dialogue: line.dialogue, voiceName, projectId });
      setSceneAudio((p: any) => ({ ...p, [i]: data.audioUrl }));
    } catch (e: any) {
      toast.error('配置音频失败: ' + e.message);
    } finally {
      useProjectStore.getState().setProcessingScene((p: any) => ({ ...p, [i]: null }));
    }
  }, []);

  const handleGenerateCoverPrompt = useCallback(async (ratio: string) => {
    const { aiProvider, artStyle, characters, setProcessingCovers, setCoverPrompts } = useProjectStore.getState();
    setProcessingCovers((p: any) => ({ ...p, [ratio]: 'prompt' }));
    try {
      const data = await fetchApi('/api/generate-prompts', {
        aiProvider,
        taskType: 'cover_prompt',
        artStyle,
        fullScriptContext: getFullScriptContext(),
        characterDetails: characters.map((c: Character) => `${c.name}: ${c.persona}`).join('\n'),
      });
      setCoverPrompts((p: any) => ({ ...p, [ratio]: data.prompt }));
    } catch (e: any) {
      toast.error('封面提示词生成失败: ' + e.message);
    } finally {
      useProjectStore.getState().setProcessingCovers((p: any) => ({ ...p, [ratio]: null }));
    }
  }, [getFullScriptContext]);

  const handleGenerateCoverAsset = useCallback(async (ratio: string) => {
    const { flowUrl, characters, coverPrompts, projectId, setProcessingCovers, setCoverImages } = useProjectStore.getState();
    setProcessingCovers((p: any) => ({ ...p, [ratio]: 'image' }));
    try {
      const prompt = coverPrompts[ratio];
      if (!prompt) throw new Error("请先生成封面视觉提示词");

      let refKeywords: string[] = characters
          .filter((c: Character) => !['旁白', '字卡', '标题', '画外音', '系统'].some(sys => c.name.includes(sys)))
          .map((c: Character) => c.name);

      const data = await fetchApi('/api/generate-assets', { prompt, model: 'Nano Banana Pro', referenceKeywords: refKeywords, flowUrl, projectId, targetType: 'coverImage', meta: { ratio } });
      
      if (data.url) {
         setCoverImages((p: any) => ({ ...p, [ratio]: data.url }));
      }
    } catch (e: any) {
      toast.error(`生成[${ratio}]生图失败: ` + e.message);
    } finally {
      useProjectStore.getState().setProcessingCovers((p: any) => ({ ...p, [ratio]: null }));
    }
  }, []);

  return {
    handleGenerateActionPrompt,
    handleGenerateEndFrame,
    handleGenerateStartFrame,
    handleGenerateVideo,
    handleGenerateVoice,
    handleGenerateCoverPrompt,
    handleGenerateCoverAsset
  };
}
