import { useCallback } from 'react';
import { fetchApi } from './useProjectState';
import type { Character, ScriptLine } from '../types';

export function useStoryboard(state: any, getFullScriptContext: () => string) {
  const {
    projectId,
    aiProvider,
    artStyle,
    flowUrl,
    useHitlMode,
    characters,
    scriptLines,
    locationPrompt,
    sceneLocationPrompts,
    actionLayoutPrompts,
    sceneImagePrompts, setSceneImagePrompts,
    sceneVideoPrompts, setSceneVideoPrompts,
    sceneStartImagePrompts, setSceneStartImagePrompts,
    sceneCharacters, setSceneCharacters,
    sceneImages, setSceneImages,
    sceneStartImages, setSceneStartImages,
    sceneImageRefs, setSceneImageRefs,
    setSceneVideos,
    setSceneAudio,
    setProcessingScene,
    coverPrompts, setCoverPrompts,
    setCoverImages,
    setProcessingCovers,
  } = state;

  const handleGenerateActionPrompt = useCallback(async (i: number) => {
    setProcessingScene((p: any) => ({ ...p, [i]: 'action' }));
    try {
      const line = scriptLines[i];
      const allCharactersContext = characters.map((c: Character) => `${c.name}: ${c.persona}${c.voiceName ? ` | voice: ${c.voiceName}` : ''}`).join('\n');
      const previousImagePrompt = i > 0 ? sceneImagePrompts[i - 1] : "";
      const previousVideoPrompt = i > 0 ? sceneVideoPrompts[i - 1] : "";
      const activeLocationPrompt = sceneLocationPrompts[i] || locationPrompt || '';
      
      const cleanLocationContext = activeLocationPrompt.replace(/\{@Layout_[^{}]+\}/g, '').trim();
      const extractLayoutKeyword = (p: string) => {
        const matches = p.matchAll(/\{@(Layout_[^{}]+)\}/g);
        const keywords = Array.from(matches, m => m[1]);
        return keywords.length > 0 ? keywords[0] : null;
      };
      const activeActionLayoutPrompt = actionLayoutPrompts[i] || '';
      const layoutTag = extractLayoutKeyword(activeActionLayoutPrompt);
      const baseSceneToken = sceneLocationPrompts[i] ? `场景_S${i}` : '场景';
      const sceneLocationToken = layoutTag ? `${layoutTag}} 布局和 {@${baseSceneToken}` : baseSceneToken;

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
          sceneLocationToken
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
      alert('打磨视觉指令失败: ' + e.message);
    } finally {
      setProcessingScene((p: any) => ({ ...p, [i]: null }));
    }
  }, [aiProvider, scriptLines, characters, artStyle, getFullScriptContext, sceneImagePrompts, sceneVideoPrompts, actionLayoutPrompts, sceneLocationPrompts, locationPrompt, setProcessingScene, setSceneImagePrompts, setSceneVideoPrompts, setSceneStartImagePrompts, setSceneCharacters]);

  const getRefKeywords = useCallback((i: number, prompt: string) => {
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

  const handleGenerateEndFrame = useCallback(async (i: number) => {
    setProcessingScene((p: any) => ({ ...p, [i]: 'image' }));
    try {
      const prompt = sceneImagePrompts[i];
      if (!prompt) throw new Error("请先生成视觉提示词");
      const refKeywords = getRefKeywords(i, prompt);

      await fetch('/api/extension/active-context', { method: 'POST', body: JSON.stringify({ projectId, targetType: 'sceneImage', index: i }) });
      const data = await fetchApi('/api/generate-assets', { prompt, model: 'Nano Banana Pro', referenceKeywords: refKeywords, flowUrl, projectId, fireAndForget: useHitlMode });
      
      if (!data.fireAndForget) {
         setSceneImages((p: any) => ({ ...p, [i]: data.url }));
      }
    } catch (e: any) {
      alert('生成尾帧失败: ' + e.message);
    } finally {
      setProcessingScene((p: any) => ({ ...p, [i]: null }));
    }
  }, [sceneImagePrompts, getRefKeywords, flowUrl, projectId, useHitlMode, setProcessingScene, setSceneImages]);

  const handleGenerateStartFrame = useCallback(async (i: number) => {
    setProcessingScene((p: any) => ({ ...p, [i]: 'image' }));
    try {
      const prompt = sceneStartImagePrompts[i];
      if (!prompt) throw new Error("该镜头没有首帧提示词（仅第1镜需要生成首帧）");
      const refKeywords = getRefKeywords(i, prompt);

      await fetch('/api/extension/active-context', { method: 'POST', body: JSON.stringify({ projectId, targetType: 'sceneStartImage', index: i }) });
      const data = await fetchApi('/api/generate-assets', { prompt, model: 'Nano Banana Pro', referenceKeywords: refKeywords, flowUrl, projectId, fireAndForget: useHitlMode });
      
      if (!data.fireAndForget) {
         setSceneStartImages((p: any) => ({ ...p, [i]: data.url }));
      }
    } catch (e: any) {
      alert('生成首帧失败: ' + e.message);
    } finally {
      setProcessingScene((p: any) => ({ ...p, [i]: null }));
    }
  }, [sceneStartImagePrompts, getRefKeywords, flowUrl, projectId, useHitlMode, setProcessingScene, setSceneStartImages]);

  const handleGenerateVideo = useCallback(async (i: number) => {
    setProcessingScene((p: any) => ({ ...p, [i]: 'video' }));
    try {
      const videoPrompt = sceneVideoPrompts[i];
      const endImage = sceneImages[i];
      const startImage = i === 0 ? sceneStartImages[0] : sceneImages[i - 1];
      
      if (!videoPrompt) throw new Error("请确保有视频提示词！");
      if (!endImage) throw new Error("请确保有尾帧图！");
      if (!startImage) throw new Error(i === 0 ? "请生成第1镜的首帧图！" : "请确保上一镜已有尾帧图！");

      let prompt = videoPrompt.trim();
      
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
          setSceneVideos((p: any) => ({ ...p, [i]: data.url }));
      }
    } catch (e: any) {
      alert('渲染视频失败: ' + e.message);
    } finally {
      setProcessingScene((p: any) => ({ ...p, [i]: null }));
    }
  }, [sceneVideoPrompts, sceneImages, sceneStartImages, sceneImageRefs, sceneStartImagePrompts, sceneImagePrompts, getRefKeywords, flowUrl, projectId, useHitlMode, setProcessingScene, setSceneVideos]);

  const handleGenerateVoice = useCallback(async (i: number) => {
    setProcessingScene((p: any) => ({ ...p, [i]: 'voice' }));
    try {
      const line = scriptLines[i];
      if (!line.dialogue) throw new Error("该幕没有台词，无法配音！");

      const charConfig = characters.find((c: Character) => c.name === line.speaker);
      const voiceName = charConfig?.voiceName || "Zephyr";

      const data = await fetchApi('/api/generate-voice', { dialogue: line.dialogue, voiceName, projectId });
      setSceneAudio((p: any) => ({ ...p, [i]: data.audioUrl }));
    } catch (e: any) {
      alert('配置音频失败: ' + e.message);
    } finally {
      setProcessingScene((p: any) => ({ ...p, [i]: null }));
    }
  }, [scriptLines, characters, projectId, setProcessingScene, setSceneAudio]);

  const handleGenerateCoverPrompt = useCallback(async (ratio: string) => {
    setProcessingCovers((p: any) => ({ ...p, [ratio]: 'prompt' }));
    try {
      const allCharactersContext = characters
          .filter((c: Character) => !['旁白', '字卡', '标题', '画外音', '系统'].some(sys => c.name.includes(sys)))
          .map((c: Character) => c.name)
          .join(', ');

      const data = await fetchApi('/api/generate-prompts', {
          aiProvider,
          taskType: 'cover_prompt',
          theme: '', 
          artStyle,
          fullScriptContext: getFullScriptContext(),
          allCharactersContext
      });
      setCoverPrompts((p: any) => ({ ...p, [ratio]: data.prompt }));
    } catch (e: any) {
      alert(`生成[${ratio}]封面指令失败: ` + e.message);
    } finally {
      setProcessingCovers((p: any) => ({ ...p, [ratio]: null }));
    }
  }, [aiProvider, characters, artStyle, getFullScriptContext, setProcessingCovers, setCoverPrompts]);

  const handleGenerateCoverAsset = useCallback(async (ratio: string) => {
    setProcessingCovers((p: any) => ({ ...p, [ratio]: 'image' }));
    try {
      const prompt = coverPrompts[ratio];
      if (!prompt) throw new Error("请先生成封面视觉提示词");

      let refKeywords: string[] = characters
          .filter((c: Character) => !['旁白', '字卡', '标题', '画外音', '系统'].some(sys => c.name.includes(sys)))
          .map((c: Character) => c.name);

      await fetch('/api/extension/active-context', { method: 'POST', body: JSON.stringify({ projectId, targetType: 'coverImage', meta: { ratio } }) });
      const data = await fetchApi('/api/generate-assets', { prompt, model: 'Nano Banana Pro', referenceKeywords: refKeywords, flowUrl, projectId, fireAndForget: useHitlMode });
      
      if (data.url && !useHitlMode) {
         setCoverImages((p: any) => ({ ...p, [ratio]: data.url }));
      }
    } catch (e: any) {
      alert(`生成[${ratio}]生图失败: ` + e.message);
    } finally {
      setProcessingCovers((p: any) => ({ ...p, [ratio]: null }));
    }
  }, [coverPrompts, characters, flowUrl, projectId, useHitlMode, setProcessingCovers, setCoverImages]);

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
