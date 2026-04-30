'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Film, Layers, FolderOpen, Settings, BookOpen, Mic, Sparkles, Coffee, Trash2, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from '@/lib/toast';
import SystemSettingsModal from './SystemSettingsModal';

interface ProjectInfo {
  projectId: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  currentPhase: number;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [showLegacyCreate, setShowLegacyCreate] = useState(false);
  const [newLegacyName, setNewLegacyName] = useState('');

  const [globalSettings, setGlobalSettings] = useState({
    aiProvider: 'gemini', minimaxApiKey: '', jianyingPath: '', flowUrl: '', imageModel: 'Nano Banana Pro', videoModel: 'veo_3_1_t2v_lite', proxyUrl: ''
  });

  useEffect(() => {
    fetchProjects();
    fetchGlobalSettings();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) setProjects(data.projects);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGlobalSettings = async () => {
    try {
      const res = await fetch('/api/system-state');
      const data = await res.json();
      if (data.success && data.data) {
        setGlobalSettings({
          aiProvider: data.data.aiProvider || 'gemini',
          minimaxApiKey: data.data.minimaxApiKey || '',
          jianyingPath: data.data.jianyingPath || '',
          flowUrl: data.data.flowUrl || '',
          imageModel: data.data.imageModel || 'Nano Banana Pro',
          videoModel: data.data.videoModel || 'veo_3_1_t2v_lite',
          proxyUrl: data.data.proxyUrl || '',
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateGlobalSetting = async (key: string, value: string) => {
    setGlobalSettings(prev => ({ ...prev, [key]: value }));
    try {
      await fetch('/api/system-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const openLegacyCreate = () => {
    setNewLegacyName('');
    setShowLegacyCreate(true);
  };

  const handleCreateLegacyProject = async () => {
    if (!newLegacyName.trim()) return;
    setCreatingProject(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: newLegacyName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = `/studio/${encodeURIComponent(data.projectId)}`;
      } else {
        toast.error('立项失败: ' + data.error);
      }
    } catch (e: any) {
      toast.error('立项失败: ' + e.message);
    } finally {
      setCreatingProject(false);
    }
  };

  const handleDeleteLegacyProject = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确定要删除这个项目吗？')) return;
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => prev.filter(p => p.projectId !== projectId));
      } else {
        toast.error('删除失败: ' + data.error);
      }
    } catch (e: any) {
      toast.error('删除失败: ' + e.message);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Sidebar */}
      <div 
        className={`bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0 transition-all duration-300 z-20 shadow-xl ${isSidebarOpen ? 'w-64' : 'w-16'}`}
      >
        {/* Toggle & Logo */}
        <div className="h-16 px-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className={`flex items-center gap-3 overflow-hidden ${isSidebarOpen ? 'w-auto' : 'w-0'}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shrink-0">
              <Sparkles className="text-white w-4 h-4" />
            </div>
            <span className="font-extrabold truncate whitespace-nowrap text-white">自由创作室</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors shrink-0 mx-auto"
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 overflow-x-hidden">
          
          {/* Main Links */}
          <div className="px-2 flex flex-col gap-1">
            <a href="/" className="flex items-center gap-3 px-3 py-2.5 bg-amber-600/10 text-amber-400 rounded-xl font-bold border border-amber-500/20 group whitespace-nowrap" title="自由创作室">
              <Sparkles className="w-5 h-5 shrink-0" />
              <span className={`transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>自由创作室</span>
            </a>
            <a href="/scene-lab" className="flex items-center gap-3 px-3 py-2.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 rounded-xl font-medium transition-colors whitespace-nowrap" title="定制化画板">
              <Layers className="w-5 h-5 text-purple-400 shrink-0" />
              <span className={`transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>定制化画板</span>
            </a>
            <a href="/prompt-studio" className="flex items-center gap-3 px-3 py-2.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 rounded-xl font-medium transition-colors whitespace-nowrap" title="提示词中心">
              <BookOpen className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className={`transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>提示词中心</span>
            </a>
            <a href="/voice-room" className="flex items-center gap-3 px-3 py-2.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 rounded-xl font-medium transition-colors whitespace-nowrap" title="配音区">
              <Mic className="w-5 h-5 text-pink-400 shrink-0" />
              <span className={`transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>配音区</span>
            </a>
          </div>

          <div className="my-2 border-t border-neutral-800 mx-4" />

          {/* Legacy Projects */}
          <div className="px-2">
            <div 
              className={`flex items-center justify-between px-3 py-2 text-neutral-500 hover:text-neutral-300 cursor-pointer ${isSidebarOpen ? '' : 'justify-center'}`}
              onClick={() => {
                if (!isSidebarOpen) setIsSidebarOpen(true);
                else setIsProjectsExpanded(!isProjectsExpanded);
              }}
              title="旧版工作台项目"
            >
              <div className="flex items-center gap-3 whitespace-nowrap">
                <FolderOpen className="w-5 h-5 shrink-0" />
                <span className={`text-[10px] font-bold uppercase tracking-wider transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                  旧版工作台项目
                </span>
              </div>
              {isSidebarOpen && (
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openLegacyCreate(); }} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white" title="新建旧版项目">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isProjectsExpanded ? 'rotate-90' : ''}`} />
                </div>
              )}
            </div>

            {isSidebarOpen && isProjectsExpanded && (
              <div className="mt-1 flex flex-col gap-0.5">
                {projects.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-neutral-600 text-center">暂无旧项目</div>
                ) : (
                  projects.map(p => (
                    <a key={p.projectId} href={`/studio/${encodeURIComponent(p.projectId)}`} className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Film className="w-3.5 h-3.5 shrink-0 opacity-50 group-hover:text-orange-400 group-hover:opacity-100 transition-colors" />
                        <span className="text-xs truncate">{p.projectName}</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 bg-neutral-800 pl-2">
                        <span className="text-[10px] text-neutral-500">{formatDate(p.updatedAt)}</span>
                        <button onClick={(e) => handleDeleteLegacyProject(p.projectId, e)} className="text-neutral-500 hover:text-red-400 p-0.5 rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-2 border-t border-neutral-800 flex flex-col gap-1">
          <button 
            onClick={() => setShowSettings(true)}
            className={`flex items-center gap-3 px-3 py-2.5 text-neutral-400 hover:bg-neutral-800 hover:text-white rounded-xl font-medium transition-colors whitespace-nowrap ${!isSidebarOpen && 'justify-center'}`}
            title="系统设置"
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span className={`transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>系统设置</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden bg-[#0a0a0a]">
        {children}
      </div>

      {/* Modals */}
      {showSettings && (
        <SystemSettingsModal 
          onClose={() => setShowSettings(false)} 
          onOpenDonate={() => setShowDonate(true)}
          globalSettings={globalSettings}
          updateGlobalSetting={updateGlobalSetting}
        />
      )}

      {showLegacyCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowLegacyCreate(false)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 text-white">新建旧版项目</h2>
            <div className="mb-6">
              <label className="text-sm text-neutral-400 block mb-2">项目名称（将作为文件夹名称）</label>
              <input
                type="text"
                autoFocus
                className="w-full bg-black/60 border border-neutral-700 rounded-xl p-4 text-white text-lg focus:border-orange-500 focus:outline-none placeholder-neutral-600"
                placeholder="例如：鸭子职场风云"
                value={newLegacyName}
                onChange={e => setNewLegacyName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateLegacyProject(); }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLegacyCreate(false)}
                className="px-5 py-2.5 text-neutral-400 hover:text-white transition-colors rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreateLegacyProject}
                disabled={creatingProject || !newLegacyName.trim()}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingProject ? '创建中...' : '立项开工'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDonate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDonate(false)}>
          <div className="bg-neutral-900 border border-neutral-700 border-t-[6px] border-t-amber-500 rounded-2xl p-8 w-full max-w-sm shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                <Coffee className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">请作者喝杯咖啡</h2>
              <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
                本项目非商用、免费开放使用。<br/>如果借助本工具打造出爆款短剧，或是帮你节省了高额 API 调用成本，欢迎自愿打赏支持！你的认可与鼓励，是我持续更新维护的最大动力。
              </p>
              
              {/* QR Code */}
              <div className="w-44 h-44 rounded-2xl shadow-2xl shadow-black/30 mb-6 overflow-hidden">
                <img src="/donate-qr.jpg" alt="微信收款码" className="w-full h-full object-cover" />
              </div>

              <button
                onClick={() => setShowDonate(false)}
                className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl transition-colors w-full"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
