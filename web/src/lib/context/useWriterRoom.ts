import { useCallback } from 'react';
import type { Character, ScriptLine, InspirationItem, ScriptReview } from '../types';
import { fetchApi } from './useProjectState';
import { toast } from '../toast';
import { useProjectStore } from '../store/useProjectStore';
import { autoConfigureVoices } from '../voiceUtils';

export function useWriterRoom(setCurrentPhase: (phase: number) => void) {
  const getFullScriptContext = useCallback(() => {
    const { rawScript, scriptLines } = useProjectStore.getState();
    if (rawScript && rawScript.trim().length > 0) {
      return `【原始完整剧本（请重点体会环境、时间、氛围等场景细节）】\n${rawScript}`;
    }
    return scriptLines.map((s: ScriptLine, i: number) => `[Scene ${i + 1}] ${s.speaker}: (Action: ${s.actionHint}) - "${s.dialogue}"`).join('\n');
  }, []);

  const handleBrainstormDirectly = useCallback(async (themeParam: string) => {
    useProjectStore.getState().setIsBrainstorming(true);
    const { aiProvider } = useProjectStore.getState();
    try {
      const promptData = await fetchApi('/api/generate-prompts', { aiProvider, taskType: 'script', theme: themeParam });
      const characters = autoConfigureVoices(promptData.characters || []);
      useProjectStore.getState().setCharacters(characters);
      useProjectStore.getState().setScriptLines(promptData.script || []);
      setCurrentPhase(1);
    } catch (err: any) {
      toast.error('剧本创作失败: ' + err.message);
    } finally {
      useProjectStore.getState().setIsBrainstorming(false);
    }
  }, [setCurrentPhase]);

  const handleFetchRedditJokes = useCallback(async (sourceOrSubreddit = 'curated') => {
    useProjectStore.getState().setIsFetchingReddit(true);
    try {
      const apiUrl = sourceOrSubreddit === 'curated'
        ? '/api/fetch-inspiration?source=curated'
        : `/api/fetch-inspiration?source=reddit&subreddit=${sourceOrSubreddit}&limit=25&sort=top&time=all`;
      
      const res = await fetch(apiUrl);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      useProjectStore.getState().setInspirations((prev: InspirationItem[]) => {
        const existingIds = new Set(prev.map(p => p.id));
        const newItems = (data.items || []).filter((item: InspirationItem) => !existingIds.has(item.id));
        return [...newItems, ...prev];
      });
    } catch (e: any) {
      toast.error('段子拉取失败: ' + e.message);
    } finally {
      useProjectStore.getState().setIsFetchingReddit(false);
    }
  }, []);

  const handleAddManualInspiration = useCallback((title: string, content: string) => {
    const item: InspirationItem = {
      id: `manual_${Date.now()}`,
      source: 'manual',
      title,
      content,
      addedAt: new Date().toISOString(),
    };
    useProjectStore.getState().setInspirations((prev: InspirationItem[]) => [item, ...prev]);
  }, []);

  const handleRemoveInspiration = useCallback((id: string) => {
    useProjectStore.getState().setInspirations((prev: InspirationItem[]) => prev.filter(p => p.id !== id));
  }, []);

  const handleSelectInspiration = useCallback((item: InspirationItem) => {
    useProjectStore.getState().setTheme(`${item.title}\n\n${item.content}`);
  }, []);

  const handleGenerateScript = useCallback(async () => {
    const { theme, creativeMode, userDirection, aiProvider } = useProjectStore.getState();
    if (!theme.trim()) {
      toast.warning('请先在灵感库中选择素材或输入创作方向！');
      return;
    }
    useProjectStore.getState().setIsGeneratingScript(true);
    try {
      const data = await fetchApi('/api/generate-prompts', { aiProvider, taskType: 'script_v2', theme, creativeMode, userDirection });
      useProjectStore.getState().setRawScript(data.script || '');
      useProjectStore.getState().setScriptReview(null);
      useProjectStore.getState().setScriptIteration(0);
      useProjectStore.getState().setWriterStep(2);
    } catch (e: any) {
      toast.error('剧本生成失败: ' + e.message);
    } finally {
      useProjectStore.getState().setIsGeneratingScript(false);
    }
  }, []);

  const handleIterateScript = useCallback(async () => {
    const { rawScript, userDirection, aiProvider } = useProjectStore.getState();
    if (!rawScript.trim()) return;
    if (!userDirection.trim()) {
      toast.warning('请在下方输入框告诉 AI 你想怎么改！');
      return;
    }
    useProjectStore.getState().setIsIteratingScript(true);
    try {
      const data = await fetchApi('/api/generate-prompts', { aiProvider, taskType: 'script_iterate', theme: rawScript, userDirection });
      useProjectStore.getState().setRawScript(data.script || '');
      useProjectStore.getState().setScriptReview(null);
    } catch (e: any) {
      toast.error('迭代剧本失败: ' + e.message);
    } finally {
      useProjectStore.getState().setIsIteratingScript(false);
    }
  }, []);

  const handleReviewScript = useCallback(async () => {
    const { rawScript, scriptIteration, aiProvider } = useProjectStore.getState();
    if (!rawScript.trim()) return;
    useProjectStore.getState().setIsReviewingScript(true);
    try {
      const data = await fetchApi('/api/generate-prompts', { aiProvider, taskType: 'script_review', theme: rawScript });
      const review: ScriptReview = {
        hook: data.hook || 0, twist: data.twist || 0, pacing: data.pacing || 0, character: data.character || 0, retention: data.retention || 0,
        totalScore: data.totalScore || (data.hook + data.twist + data.pacing + data.character + data.retention),
        verdict: data.verdict || ((data.hook + data.twist + data.pacing + data.character + data.retention) >= 40 ? 'pass' : 'revise'),
        feedback: data.feedback || '', iteration: scriptIteration + 1,
      };
      useProjectStore.getState().setScriptReview(review);
      useProjectStore.getState().setScriptIteration(review.iteration);

      if (review.verdict === 'revise' && review.iteration < 3) {
        useProjectStore.getState().setUserDirection((prev: string) => `${prev ? prev + '\n' : ''}[第${review.iteration}轮评审反馈] ${review.feedback}`);
      }
    } catch (e: any) {
      toast.error('评审打分失败: ' + e.message);
    } finally {
      useProjectStore.getState().setIsReviewingScript(false);
    }
  }, []);

  const handleScriptToScenes = useCallback(async () => {
    const { rawScript, aiProvider } = useProjectStore.getState();
    if (!rawScript.trim()) return;
    useProjectStore.getState().setIsSplittingScript(true);
    try {
      const data = await fetchApi('/api/generate-prompts', { aiProvider, taskType: 'script_to_scenes', theme: rawScript });
      const characters = autoConfigureVoices(data.characters || []);
      useProjectStore.getState().setCharacters(characters);
      useProjectStore.getState().setScriptLines(data.script || []);
      useProjectStore.getState().setWriterStep(3);
    } catch (e: any) {
      toast.error('分镜拆解失败: ' + e.message);
    } finally {
      useProjectStore.getState().setIsSplittingScript(false);
    }
  }, []);

  const updateCharacter = useCallback((index: number, field: string, value: any) => {
    useProjectStore.getState().setCharacters((prev: Character[]) => {
      const newChars = [...prev];
      let updatedChar = { ...newChars[index], [field]: value };
      
      // 如果修改了 persona 或 voice 字段，并且当前没有 voiceName，自动配置
      if ((field === 'persona' || field === 'voice') && !updatedChar.voiceName) {
        updatedChar = autoConfigureVoices([updatedChar])[0];
      }
      
      newChars[index] = updatedChar;
      return newChars;
    });
  }, []);

  const updateScriptLine = useCallback((index: number, field: string, value: string) => {
    useProjectStore.getState().setScriptLines((prev: ScriptLine[]) => {
      const newLines = [...prev];
      newLines[index] = { ...newLines[index], [field]: value };
      return newLines;
    });
  }, []);

  const addCharacter = useCallback(() => {
    useProjectStore.getState().setCharacters((prev: Character[]) => [...prev, { name: "新角色", persona: "", isProtagonist: false, voiceName: "Zephyr" }]);
  }, []);

  const removeCharacter = useCallback((index: number) => {
    useProjectStore.getState().setCharacters((prev: Character[]) => prev.filter((_, i) => i !== index));
  }, []);

  const addScriptLine = useCallback((index: number) => {
    useProjectStore.getState().setScriptLines((prev: ScriptLine[]) => {
      const newLines = [...prev];
      const chars = useProjectStore.getState().characters;
      newLines.splice(index + 1, 0, { speaker: chars[0]?.name || "新角色", actionHint: "动作", dialogue: "台词" });
      return newLines;
    });
  }, []);

  const removeScriptLine = useCallback((index: number) => {
    useProjectStore.getState().setScriptLines((prev: ScriptLine[]) => prev.filter((_, i) => i !== index));
  }, []);

  const moveScriptLine = useCallback((index: number, direction: 'up' | 'down') => {
    useProjectStore.getState().setScriptLines((prev: ScriptLine[]) => {
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;
      const newLines = [...prev];
      const swap = direction === 'up' ? index - 1 : index + 1;
      [newLines[index], newLines[swap]] = [newLines[swap], newLines[index]];
      return newLines;
    });
  }, []);

  return {
    getFullScriptContext,
    handleBrainstormDirectly,
    handleFetchRedditJokes,
    handleAddManualInspiration,
    handleRemoveInspiration,
    handleSelectInspiration,
    handleGenerateScript,
    handleIterateScript,
    handleReviewScript,
    handleScriptToScenes,
    updateCharacter,
    updateScriptLine,
    addCharacter,
    removeCharacter,
    addScriptLine,
    removeScriptLine,
    moveScriptLine
  };
}
