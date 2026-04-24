import { useCallback } from 'react';
import type { Character, ScriptLine, InspirationItem, ScriptReview } from '../types';
import { fetchApi } from './useProjectState';

export function useWriterRoom(state: any) {
  const {
    aiProvider,
    theme, setTheme,
    characters, setCharacters,
    scriptLines, setScriptLines,
    setCurrentPhase,
    setInspirations,
    creativeMode,
    rawScript, setRawScript,
    scriptIteration, setScriptIteration,
    userDirection, setUserDirection,
    setScriptReview,
    setWriterStep,
    setIsBrainstorming,
    setIsFetchingReddit,
    setIsGeneratingScript,
    setIsIteratingScript,
    setIsReviewingScript,
    setIsSplittingScript
  } = state;

  const getFullScriptContext = useCallback(() => {
    if (rawScript && rawScript.trim().length > 0) {
      return `【原始完整剧本（请重点体会环境、时间、氛围等场景细节）】\n${rawScript}`;
    }
    return scriptLines.map((s: ScriptLine, i: number) => `[Scene ${i + 1}] ${s.speaker}: (Action: ${s.actionHint}) - "${s.dialogue}"`).join('\n');
  }, [rawScript, scriptLines]);

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
  }, [aiProvider, setCharacters, setCurrentPhase, setIsBrainstorming, setScriptLines]);

  const handleFetchRedditJokes = useCallback(async (sourceOrSubreddit = 'curated') => {
    setIsFetchingReddit(true);
    try {
      const apiUrl = sourceOrSubreddit === 'curated'
        ? '/api/fetch-inspiration?source=curated'
        : `/api/fetch-inspiration?source=reddit&subreddit=${sourceOrSubreddit}&limit=25&sort=top&time=all`;
      
      const res = await fetch(apiUrl);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInspirations((prev: InspirationItem[]) => {
        const existingIds = new Set(prev.map(p => p.id));
        const newItems = (data.items || []).filter((item: InspirationItem) => !existingIds.has(item.id));
        return [...newItems, ...prev];
      });
    } catch (e: any) {
      alert('段子拉取失败: ' + e.message);
    } finally {
      setIsFetchingReddit(false);
    }
  }, [setInspirations, setIsFetchingReddit]);

  const handleAddManualInspiration = useCallback((title: string, content: string) => {
    const item: InspirationItem = {
      id: `manual_${Date.now()}`,
      source: 'manual',
      title,
      content,
      addedAt: new Date().toISOString(),
    };
    setInspirations((prev: InspirationItem[]) => [item, ...prev]);
  }, [setInspirations]);

  const handleRemoveInspiration = useCallback((id: string) => {
    setInspirations((prev: InspirationItem[]) => prev.filter(p => p.id !== id));
  }, [setInspirations]);

  const handleSelectInspiration = useCallback((item: InspirationItem) => {
    setTheme(`${item.title}\n\n${item.content}`);
  }, [setTheme]);

  const handleGenerateScript = useCallback(async () => {
    if (!theme.trim()) {
      alert('请先在灵感库中选择素材或输入创作方向！');
      return;
    }
    setIsGeneratingScript(true);
    try {
      const data = await fetchApi('/api/generate-prompts', { aiProvider, taskType: 'script_v2', theme, creativeMode, userDirection });
      setRawScript(data.script || '');
      setScriptReview(null);
      setScriptIteration(0);
      setWriterStep(2);
    } catch (e: any) {
      alert('剧本生成失败: ' + e.message);
    } finally {
      setIsGeneratingScript(false);
    }
  }, [aiProvider, theme, creativeMode, userDirection, setIsGeneratingScript, setRawScript, setScriptReview, setScriptIteration, setWriterStep]);

  const handleIterateScript = useCallback(async () => {
    if (!rawScript.trim()) return;
    if (!userDirection.trim()) {
      alert('请在下方输入框告诉 AI 你想怎么改！');
      return;
    }
    setIsIteratingScript(true);
    try {
      const data = await fetchApi('/api/generate-prompts', { aiProvider, taskType: 'script_iterate', theme: rawScript, userDirection });
      setRawScript(data.script || '');
      setScriptReview(null);
    } catch (e: any) {
      alert('迭代剧本失败: ' + e.message);
    } finally {
      setIsIteratingScript(false);
    }
  }, [aiProvider, rawScript, userDirection, setIsIteratingScript, setRawScript, setScriptReview]);

  const handleReviewScript = useCallback(async () => {
    if (!rawScript.trim()) return;
    setIsReviewingScript(true);
    try {
      const data = await fetchApi('/api/generate-prompts', { aiProvider, taskType: 'script_review', theme: rawScript });
      const review: ScriptReview = {
        hook: data.hook || 0, twist: data.twist || 0, pacing: data.pacing || 0, character: data.character || 0, retention: data.retention || 0,
        totalScore: data.totalScore || (data.hook + data.twist + data.pacing + data.character + data.retention),
        verdict: data.verdict || ((data.hook + data.twist + data.pacing + data.character + data.retention) >= 40 ? 'pass' : 'revise'),
        feedback: data.feedback || '', iteration: scriptIteration + 1,
      };
      setScriptReview(review);
      setScriptIteration(review.iteration);

      if (review.verdict === 'revise' && review.iteration < 3) {
        setUserDirection((prev: string) => `${prev ? prev + '\n' : ''}[第${review.iteration}轮评审反馈] ${review.feedback}`);
      }
    } catch (e: any) {
      alert('评审打分失败: ' + e.message);
    } finally {
      setIsReviewingScript(false);
    }
  }, [aiProvider, rawScript, scriptIteration, setIsReviewingScript, setScriptReview, setScriptIteration, setUserDirection]);

  const handleScriptToScenes = useCallback(async () => {
    if (!rawScript.trim()) return;
    setIsSplittingScript(true);
    try {
      const data = await fetchApi('/api/generate-prompts', { aiProvider, taskType: 'script_to_scenes', theme: rawScript });
      setCharacters(data.characters || []);
      setScriptLines(data.script || []);
      setWriterStep(3);
    } catch (e: any) {
      alert('分镜拆解失败: ' + e.message);
    } finally {
      setIsSplittingScript(false);
    }
  }, [aiProvider, rawScript, setIsSplittingScript, setCharacters, setScriptLines, setWriterStep]);

  const updateCharacter = useCallback((index: number, field: string, value: any) => {
    setCharacters((prev: Character[]) => {
      const newChars = [...prev];
      newChars[index] = { ...newChars[index], [field]: value };
      return newChars;
    });
  }, [setCharacters]);

  const updateScriptLine = useCallback((index: number, field: string, value: string) => {
    setScriptLines((prev: ScriptLine[]) => {
      const newLines = [...prev];
      newLines[index] = { ...newLines[index], [field]: value };
      return newLines;
    });
  }, [setScriptLines]);

  const addCharacter = useCallback(() => {
    setCharacters((prev: Character[]) => [...prev, { name: "新角色", persona: "", isProtagonist: false, voiceName: "Zephyr" }]);
  }, [setCharacters]);

  const removeCharacter = useCallback((index: number) => {
    setCharacters((prev: Character[]) => prev.filter((_, i) => i !== index));
  }, [setCharacters]);

  const addScriptLine = useCallback((index: number) => {
    setScriptLines((prev: ScriptLine[]) => {
      const newLines = [...prev];
      newLines.splice(index + 1, 0, { speaker: characters[0]?.name || "新角色", actionHint: "动作", dialogue: "台词" });
      return newLines;
    });
  }, [characters, setScriptLines]);

  const removeScriptLine = useCallback((index: number) => {
    setScriptLines((prev: ScriptLine[]) => prev.filter((_, i) => i !== index));
  }, [setScriptLines]);

  const moveScriptLine = useCallback((index: number, direction: 'up' | 'down') => {
    setScriptLines((prev: ScriptLine[]) => {
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;
      const newLines = [...prev];
      const swap = direction === 'up' ? index - 1 : index + 1;
      [newLines[index], newLines[swap]] = [newLines[swap], newLines[index]];
      return newLines;
    });
  }, [setScriptLines]);

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
