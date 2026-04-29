'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Mic, Play, Pause, Volume2, ArrowLeft, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { VOICE_OPTIONS } from '@/lib/constants';

interface ProjectInfo {
  id: string;
  projectName: string;
  currentPhase: number;
}

interface ScriptLine {
  speaker: string;
  actionHint: string;
  dialogue: string;
}

interface VoiceLineState {
  audioUrl: string;
  voiceName: string;
  generating: boolean;
  playing: boolean;
}

export default function VoiceRoomPage() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [scriptLines, setScriptLines] = useState<ScriptLine[]>([]);
  const [characters, setCharacters] = useState<{ name: string; voiceName?: string }[]>([]);
  const [existingAudio, setExistingAudio] = useState<Record<number, string>>({});
  const [voiceStates, setVoiceStates] = useState<Record<number, VoiceLineState>>({});
  const [loading, setLoading] = useState(false);
  const [expandedLines, setExpandedLines] = useState<Record<number, boolean>>({});
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [globalVoiceName, setGlobalVoiceName] = useState('Zephyr');

  const audioRefs = React.useRef<Record<number, HTMLAudioElement>>({});

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setProjects(data.projects || []);
        }
      })
      .catch(() => {});
  }, []);

  const loadProject = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/state?projectId=${encodeURIComponent(projectId)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setScriptLines(data.data.scriptLines || []);
        setCharacters(data.data.characters || []);
        setExistingAudio(data.data.sceneAudio || {});
        const initialStates: Record<number, VoiceLineState> = {};
        (data.data.scriptLines || []).forEach((_: ScriptLine, i: number) => {
          const charConfig = (data.data.characters || []).find(
            (c: { name: string }) => c.name === _?.speaker
          );
          initialStates[i] = {
            audioUrl: data.data.sceneAudio?.[i] || '',
            voiceName: charConfig?.voiceName || 'Zephyr',
            generating: false,
            playing: false,
          };
        });
        setVoiceStates(initialStates);
        setExpandedLines({});
      }
    } catch (e: any) {
      console.error('Failed to load project:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadProject(selectedProjectId);
    }
  }, [selectedProjectId, loadProject]);

  const handleGenerateVoice = useCallback(async (index: number) => {
    const line = scriptLines[index];
    if (!line?.dialogue) return;

    setVoiceStates(prev => ({
      ...prev,
      [index]: { ...prev[index], generating: true },
    }));

    try {
      const voiceName = voiceStates[index]?.voiceName || globalVoiceName;
      const res = await fetch('/api/generate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dialogue: line.dialogue,
          voiceName,
          projectId: selectedProjectId,
        }),
      });
      const data = await res.json();
      if (data.audioUrl) {
        setVoiceStates(prev => ({
          ...prev,
          [index]: { ...prev[index], audioUrl: data.audioUrl, generating: false },
        }));
        setExistingAudio(prev => ({ ...prev, [index]: data.audioUrl }));
      } else {
        throw new Error(data.error || '生成失败');
      }
    } catch (e: any) {
      alert('配音生成失败: ' + e.message);
      setVoiceStates(prev => ({
        ...prev,
        [index]: { ...prev[index], generating: false },
      }));
    }
  }, [scriptLines, selectedProjectId, globalVoiceName, voiceStates]);

  const handleBatchGenerate = useCallback(async () => {
    setBatchGenerating(true);
    const linesWithDialogue = scriptLines
      .map((line, i) => ({ line, index: i }))
      .filter(({ line }) => line.dialogue);

    for (const { index } of linesWithDialogue) {
      await handleGenerateVoice(index);
    }
    setBatchGenerating(false);
  }, [scriptLines, handleGenerateVoice]);

  const togglePlay = useCallback((index: number) => {
    const url = voiceStates[index]?.audioUrl || existingAudio[index];
    if (!url) return;

    Object.entries(audioRefs.current).forEach(([key, audio]) => {
      if (parseInt(key) !== index) {
        audio.pause();
        setVoiceStates(prev => ({
          ...prev,
          [parseInt(key)]: { ...prev[parseInt(key)], playing: false },
        }));
      }
    });

    const audio = audioRefs.current[index];
    if (!audio) {
      const newAudio = new Audio(url);
      newAudio.onended = () => {
        setVoiceStates(prev => ({
          ...prev,
          [index]: { ...prev[index], playing: false },
        }));
      };
      newAudio.play();
      audioRefs.current[index] = newAudio;
      setVoiceStates(prev => ({
        ...prev,
        [index]: { ...prev[index], playing: true },
      }));
    } else if (audio.paused) {
      audio.play();
      setVoiceStates(prev => ({
        ...prev,
        [index]: { ...prev[index], playing: true },
      }));
    } else {
      audio.pause();
      setVoiceStates(prev => ({
        ...prev,
        [index]: { ...prev[index], playing: false },
      }));
    }
  }, [voiceStates, existingAudio]);

  const toggleExpand = (index: number) => {
    setExpandedLines(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const updateVoiceName = (index: number, voiceName: string) => {
    setVoiceStates(prev => ({
      ...prev,
      [index]: { ...prev[index], voiceName },
    }));
  };

  const voiceOptionsFlat = VOICE_OPTIONS.flatMap(g => g.options);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200">
      <div className="border-b border-neutral-800 px-6 py-4 flex items-center gap-4">
        <a href="/" className="text-neutral-500 hover:text-neutral-300 text-sm transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> 返回首页
        </a>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Mic className="w-6 h-6 text-pink-400" /> 配音区
        </h1>
      </div>

      <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider">选择项目</label>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-pink-500 transition-colors"
              >
                <option value="">-- 请选择项目 --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.projectName}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider">全局默认声线</label>
              <select
                value={globalVoiceName}
                onChange={e => setGlobalVoiceName(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-pink-500 transition-colors"
              >
                {VOICE_OPTIONS.map(group => (
                  <optgroup key={group.group} label={group.group}>
                    {group.options.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {scriptLines.length > 0 && (
              <button
                onClick={handleBatchGenerate}
                disabled={batchGenerating}
                className={`mt-5 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                  batchGenerating
                    ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg hover:scale-105'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${batchGenerating ? 'animate-spin' : ''}`} />
                {batchGenerating ? '批量生成中...' : '一键全量配音'}
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center py-12 text-neutral-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            加载项目数据中...
          </div>
        )}

        {!loading && selectedProjectId && scriptLines.length === 0 && (
          <div className="text-center py-12 text-neutral-500">
            该项目暂无剧本台词，请先在剧本室创建剧本。
          </div>
        )}

        {!loading && scriptLines.length > 0 && (
          <div className="flex flex-col gap-3">
            {scriptLines.map((line, i) => {
              const vs = voiceStates[i] || { audioUrl: '', voiceName: 'Zephyr', generating: false, playing: false };
              const audioUrl = vs.audioUrl || existingAudio[i] || '';
              const hasDialogue = !!line.dialogue;
              const isExpanded = expandedLines[i];

              return (
                <div
                  key={i}
                  className={`bg-neutral-900 border rounded-2xl overflow-hidden transition-colors ${
                    audioUrl ? 'border-pink-500/30' : 'border-neutral-800'
                  }`}
                >
                  <div
                    className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-neutral-800/50 transition-colors"
                    onClick={() => toggleExpand(i)}
                  >
                    <span className="text-neutral-500">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>

                    <span className="bg-neutral-800 text-neutral-300 text-xs font-bold px-2.5 py-1 rounded-lg min-w-[50px] text-center">
                      幕 {i + 1}
                    </span>

                    <span className={`text-sm font-bold ${line.speaker ? 'text-pink-400' : 'text-neutral-500'}`}>
                      {line.speaker || '旁白'}
                    </span>

                    <span className="text-sm text-neutral-400 flex-1 truncate">
                      {line.dialogue || line.actionHint || '(无台词)'}
                    </span>

                    {audioUrl && (
                      <span className="flex items-center gap-1 text-pink-400 text-xs font-bold">
                        <Volume2 className="w-3.5 h-3.5" /> 已配音
                      </span>
                    )}

                    {hasDialogue && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleGenerateVoice(i);
                        }}
                        disabled={vs.generating}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          vs.generating
                            ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                            : 'bg-pink-600/20 text-pink-400 hover:bg-pink-600/40 border border-pink-500/30'
                        }`}
                      >
                        {vs.generating ? (
                          <><RefreshCw className="w-3 h-3 animate-spin" /> 生成中</>
                        ) : audioUrl ? (
                          <><Mic className="w-3 h-3" /> 重新配音</>
                        ) : (
                          <><Mic className="w-3 h-3" /> 配音</>
                        )}
                      </button>
                    )}

                    {audioUrl && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          togglePlay(i);
                        }}
                        className="w-8 h-8 rounded-full bg-pink-600/20 text-pink-400 hover:bg-pink-600/40 flex items-center justify-center transition-colors"
                      >
                        {vs.playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-4 pt-0 border-t border-neutral-800 flex flex-col gap-3">
                      <div className="mt-3 flex items-start gap-4">
                        <div className="flex-1 flex flex-col gap-2">
                          <div className="text-xs text-neutral-500 font-bold">台词内容</div>
                          <div className="bg-neutral-800/50 rounded-lg p-3 text-sm text-neutral-300 leading-relaxed">
                            {line.dialogue || <span className="text-neutral-600 italic">该幕无台词</span>}
                          </div>
                          {line.actionHint && (
                            <>
                              <div className="text-xs text-neutral-500 font-bold mt-1">动作提示</div>
                              <div className="bg-neutral-800/50 rounded-lg p-3 text-sm text-neutral-400 leading-relaxed">
                                {line.actionHint}
                              </div>
                            </>
                          )}
                        </div>

                        <div className="w-56 flex flex-col gap-2">
                          <div className="text-xs text-neutral-500 font-bold">声线选择</div>
                          <select
                            value={vs.voiceName}
                            onChange={e => updateVoiceName(i, e.target.value)}
                            className="bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-pink-500 transition-colors"
                          >
                            {VOICE_OPTIONS.map(group => (
                              <optgroup key={group.group} label={group.group}>
                                {group.options.map(opt => (
                                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>

                          {audioUrl && (
                            <div className="flex flex-col gap-1">
                              <div className="text-xs text-neutral-500 font-bold">音频预览</div>
                              <audio
                                controls
                                src={audioUrl}
                                className="w-full h-8 rounded-lg"
                                style={{ filter: 'invert(1) hue-rotate(180deg)' }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!selectedProjectId && !loading && (
          <div className="text-center py-20 text-neutral-600">
            <Mic className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-bold">请先选择一个项目</p>
            <p className="text-sm mt-1">选择项目后，将展示该项目的所有台词并支持配音</p>
          </div>
        )}
      </div>
    </div>
  );
}
