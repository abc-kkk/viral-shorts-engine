'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Film, Clock, Layers, Trash2, FolderOpen, Settings, BookOpen, Coffee, Globe, Package, HardDrive, RefreshCw, MonitorCog, X, Sparkles, Mic } from 'lucide-react';
import { toast } from '@/lib/toast';
import ConfirmDialog from './ConfirmDialog';

interface ProjectInfo {
  projectId: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  currentPhase: number;
  coverUrl: string;
}

const PHASE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: '剧本室', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  2: { label: '定妆室', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  3: { label: '画板区', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  4: { label: '渲染室', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

export default function ProjectList() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [chromeLaunching, setChromeLaunching] = useState(false);
  const [chromeDataDirFeedback, setChromeDataDirFeedback] = useState('');
  const [updateChecking, setUpdateChecking] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [globalSettings, setGlobalSettings] = useState({ aiProvider: 'gemini', minimaxApiKey: '', jianyingPath: '', flowUrl: '', imageModel: 'Nano Banana Pro', videoModel: 'veo_3_1_t2v_lite', proxyUrl: '' });

  const electronAPI = typeof window !== 'undefined' && (window as any).electronAPI?.isElectron ? (window as any).electronAPI : null;

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) setProjects(data.projects);
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    } finally {
      setLoading(false);
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

  useEffect(() => { 
    fetchProjects(); 
    fetchGlobalSettings();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: newName.trim() })
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
      setCreating(false);
    }
  };

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteTarget(projectId);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const projectId = deleteTarget;
    setDeleteTarget(null);
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
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 flex bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0 relative z-10 shadow-xl">
        {/* Logo Area */}
        <div className="p-6 border-b border-neutral-800">
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-900/50">
              <Film className="text-white w-4 h-4" />
            </div>
            <span className="truncate">绘梦漫剧</span>
          </h1>
          <p className="text-neutral-500 text-xs mt-2 font-medium tracking-wide">Comedy Skit Studio</p>
        </div>
        
        {/* Navigation */}
        <div className="p-4 flex-1 flex flex-col gap-1.5 overflow-y-auto">
          <div className="text-[10px] font-bold text-neutral-500 mb-1 px-2 uppercase tracking-wider">我的工作台</div>
          <a href="/" className="flex items-center gap-3 px-3 py-2.5 bg-orange-600/10 text-orange-400 rounded-xl font-bold border border-orange-500/20">
             <FolderOpen className="w-4 h-4" /> 项目列表
          </a>
          <a href="/scene-lab" className="flex items-center gap-3 px-3 py-2.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 rounded-xl font-medium transition-colors">
             <Layers className="w-4 h-4 text-purple-400" /> 定制化画板
          </a>
          <a href="/prompt-studio" className="flex items-center gap-3 px-3 py-2.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 rounded-xl font-medium transition-colors">
             <Film className="w-4 h-4 text-emerald-400" /> 提示词中心
          </a>
          <a href="/studio" className="flex items-center gap-3 px-3 py-2.5 text-neutral-400 hover:bg-neutral-800 hover:text-emerald-300 rounded-xl font-medium transition-colors group relative">
             <Sparkles className="w-4 h-4 text-amber-400" /> 自由创作室
             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold leading-none">NEW</span>
          </a>
          <a href="/voice-room" className="flex items-center gap-3 px-3 py-2.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 rounded-xl font-medium transition-colors">
             <Mic className="w-4 h-4 text-pink-400" /> 配音区
          </a>
          
          <div className="text-[10px] font-bold text-neutral-500 mb-1 px-2 mt-4 uppercase tracking-wider">帮助与设置</div>
          <a href="/guide" className="flex items-center gap-3 px-3 py-2.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 rounded-xl font-medium transition-colors">
             <BookOpen className="w-4 h-4 text-blue-400" /> 新手指南
          </a>
        </div>
        
        {/* Settings Area at Bottom */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex flex-col gap-1.5">
          <button
            onClick={() => {
              setShowSystemSettings(true);
              if (electronAPI) electronAPI.getAppVersion?.().then((v: string) => setAppVersion(v || ''));
            }}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-cyan-400/80 hover:bg-cyan-500/10 hover:text-cyan-300 rounded-xl font-bold transition-colors"
          >
            <Settings className="w-4 h-4" /> 系统设置
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col relative bg-[#0a0a0a]">
        {/* Top Fixed Bar */}
        <div className="shrink-0 bg-[#0a0a0a] px-8 py-4 flex justify-between items-center border-b border-neutral-800/50">
          <h2 className="text-xl font-bold text-white">
            近期项目
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-900/30 transition-all hover:-translate-y-0.5 text-sm"
          >
            <Plus className="w-4 h-4" /> 新建项目
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 pt-3 pb-12">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 gap-6">
            <div className="w-24 h-24 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <FolderOpen className="w-12 h-12 text-neutral-700" />
            </div>
            <div className="text-center">
              <p className="text-xl text-neutral-400 font-bold mb-2">还没有任何项目</p>
              <p className="text-neutral-600 text-sm">点击上方「新建项目」开始你的第一个爆款短剧制作</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" /> 立即立项
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const phase = PHASE_LABELS[project.currentPhase] || PHASE_LABELS[1];
              return (
                <a
                  key={project.projectId}
                  href={`/studio/${encodeURIComponent(project.projectId)}`}
                  className="group block bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-700 hover:shadow-xl hover:shadow-neutral-900/50 transition-all hover:-translate-y-1"
                >
                  {/* Cover */}
                  <div className="h-44 bg-neutral-800 relative overflow-hidden">
                    {project.coverUrl ? (
                      <img
                        src={project.coverUrl}
                        alt={project.projectName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                        <Film className="w-16 h-16 text-neutral-700" />
                      </div>
                    )}
                    {/* Phase badge */}
                    <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold border ${phase.color}`}>
                      <Layers className="w-3 h-3 inline mr-1" />{phase.label}
                    </div>
                    {/* Delete */}
                    <button
                      onClick={(e) => handleDelete(project.projectId, e)}
                      className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 text-neutral-400 hover:text-red-400 hover:bg-red-900/40 opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-500/30"
                      title="移到回收站"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors truncate">
                      {project.projectName}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(project.updatedAt)}
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      </div>
      </div>
      
      {/* Donate Modal */}
      {showDonate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDonate(false)}>
          <div className="bg-neutral-900 border border-neutral-700 border-t-[6px] border-t-orange-500 rounded-2xl p-8 w-full max-w-sm shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
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
                闻人廰书
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Settings Modal */}
      {showSystemSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowSystemSettings(false)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">⚙️ 系统设置</h2>
              <button onClick={() => setShowSystemSettings(false)} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-6 mb-8">
              {/* AI Provider */}
              <div>
                <label className="text-sm font-bold text-neutral-300 block mb-2">🧠 全局文本大模型 (AI Provider)</label>
                <select 
                  className="w-full bg-black/60 border border-neutral-700 rounded-lg p-3 text-neutral-300 font-bold text-sm focus:border-orange-500 focus:outline-none cursor-pointer"
                  value={globalSettings.aiProvider}
                  onChange={e => updateGlobalSetting('aiProvider', e.target.value)}
                >
                  <option value="gemini">Gemini (默认)</option>
                  <option value="doubao">豆包 Doubao</option>
                  <option value="minimax">MiniMax (稀宇科技)</option>
                </select>
                {globalSettings.aiProvider === 'minimax' && (
                  <div className="mt-3">
                    <input
                      type="password"
                      className="w-full bg-black/60 border border-neutral-700 rounded-lg p-3 text-white font-mono text-sm focus:border-orange-500 focus:outline-none"
                      value={globalSettings.minimaxApiKey}
                      onChange={e => updateGlobalSetting('minimaxApiKey', e.target.value)}
                      placeholder="请填入您的 MiniMax API Key (如果不填则可能无法调用)"
                    />
                  </div>
                )}
                <p className="text-xs text-neutral-600 mt-1.5">此选项将全局决定项目中所有剧本创作、分镜拆解及提示词润色等文本工作所使用的大语言模型。</p>
              </div>

              <div className="h-px bg-neutral-800 w-full" />

              {/* Image Model */}
              <div>
                <label className="text-sm font-bold text-neutral-300 block mb-2">🖼️ 全局生图模型 (Image Model)</label>
                <select 
                  className="w-full bg-black/60 border border-neutral-700 rounded-lg p-3 text-neutral-300 font-bold text-sm focus:border-orange-500 focus:outline-none cursor-pointer"
                  value={globalSettings.imageModel}
                  onChange={e => updateGlobalSetting('imageModel', e.target.value)}
                >
                  <option value="Nano Banana Pro">Nano Banana Pro (默认推荐: 高画质 Gemini 3.0 Pro)</option>
                  <option value="Imagen 4">Imagen 4.0 (专注生图的高质模型)</option>
                  <option value="Nano Banana 2">Nano Banana 2 (极速出图: Gemini 3.1 Flash)</option>
                </select>
                <p className="text-xs text-neutral-600 mt-1.5">此选项将全局决定自由创作室、定妆室和画板区生成图片时所使用的底层大模型。</p>
              </div>

              <div className="h-px bg-neutral-800 w-full" />

              {/* Video Model */}
              <div>
                <label className="text-sm font-bold text-neutral-300 block mb-2">🎬 全局生视频模型 (Video Model)</label>
                <select 
                  className="w-full bg-black/60 border border-neutral-700 rounded-lg p-3 text-neutral-300 font-bold text-sm focus:border-orange-500 focus:outline-none cursor-pointer"
                  value={globalSettings.videoModel}
                  onChange={e => updateGlobalSetting('videoModel', e.target.value)}
                >
                  <option value="veo_3_1_t2v_lite">Veo 3.1 - Lite (默认推荐: 极速生成)</option>
                  <option value="veo_3_1_t2v_fast">Veo 3.1 - Fast (速度与画质平衡，需高级账号)</option>
                  <option value="veo_3_1_t2v">Veo 3.1 - Quality (最高画质，需高级账号)</option>
                  <option value="veo_3_1_t2v_lite_relaxed">Veo 3.1 - Lite [Lower Priority] (低优先级排队)</option>
                  <option value="veo_3_1_t2v_fast_ultra_relaxed">Veo 3.1 - Fast [Lower Priority] (低优先级，需高级账号)</option>
                </select>
                <p className="text-xs text-neutral-600 mt-1.5">此选项将全局决定分镜创作室渲染视频时所使用的底层视频生成模型。Lower Priority 适合非紧急批量任务。</p>
              </div>

              <div className="h-px bg-neutral-800 w-full" />

              
              {/* JianYing Path */}
              <div>
                <label className="text-sm font-bold text-neutral-300 block mb-2">✂️ 剪映草稿箱自定义路径 (JianYing Draft Path)</label>
                <input 
                  type="text"
                  className="w-full bg-black/60 border border-neutral-700 rounded-lg p-3 text-white font-mono text-sm focus:border-orange-500 focus:outline-none"
                  value={globalSettings.jianyingPath}
                  onChange={e => updateGlobalSetting('jianyingPath', e.target.value)}
                  placeholder="留空则使用默认路径 (%LOCALAPPDATA%\\JianyingPro\\...)"
                />
                <p className="text-xs text-neutral-600 mt-1.5">如果你在剪映的“全局设置”里把“草稿位置”移到了别的盘，请在这里填入你的自定义文件夹路径。</p>
              </div>

              <div className="h-px bg-neutral-800 w-full" />

              {/* Proxy URL */}
              <div>
                <label className="text-sm font-bold text-neutral-300 block mb-2">🌐 全局网络代理 (HTTP/HTTPS Proxy)</label>
                <input 
                  type="text"
                  className="w-full bg-black/60 border border-neutral-700 rounded-lg p-3 text-white font-mono text-sm focus:border-orange-500 focus:outline-none"
                  value={globalSettings.proxyUrl}
                  onChange={e => updateGlobalSetting('proxyUrl', e.target.value)}
                  placeholder="例如: http://127.0.0.1:7890 (留空则不使用系统代理)"
                />
                <p className="text-xs text-neutral-600 mt-1.5">如果你在生成图片/视频时遇到 <span className="text-red-400">fetch failed</span> 错误，请在此处填入你的梯子 HTTP 端口链接，解决 Node.js 无法走系统代理的问题。</p>
              </div>
            </div>

            {electronAPI && (
              <>
                <div className="h-px bg-neutral-800 w-full mb-6" />
                <p className="text-sm text-neutral-500 mb-6 font-bold">
                  🖥️ 桌面客户端专属工具
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {/* 启动调试 Chrome */}
                  <button
                    onClick={async () => {
                      if (chromeLaunching) return;
                      setChromeLaunching(true);
                      try { await electronAPI.launchChrome(); } finally { setTimeout(() => setChromeLaunching(false), 2000); }
                    }}
                    disabled={chromeLaunching}
                    className="group flex flex-col items-start gap-2 p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50 hover:border-cyan-600/50 hover:bg-cyan-950/20 transition-all text-left disabled:opacity-50 disabled:cursor-wait"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cyan-600/15 text-cyan-400 group-hover:bg-cyan-600/25 transition-colors">
                        <Globe className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-neutral-200 group-hover:text-cyan-300 transition-colors">
                        {chromeLaunching ? '正在启动...' : '启动调试 Chrome'}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500 leading-tight">
                      一键拉起 Chrome 调试浏览器，用于登录 Google 账号、加载扩展并连接 AI 自动化。
                    </span>
                  </button>

                  {/* 更改 Chrome 数据目录 */}
                  <button
                    onClick={async () => {
                      const result = await electronAPI.changeChromeDataDir();
                      if (result) { setChromeDataDirFeedback(result); setTimeout(() => setChromeDataDirFeedback(''), 5000); }
                    }}
                    className="group flex flex-col items-start gap-2 p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50 hover:border-amber-600/50 hover:bg-amber-950/20 transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-600/15 text-amber-400 group-hover:bg-amber-600/25 transition-colors">
                        <MonitorCog className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-neutral-200 group-hover:text-amber-300 transition-colors">更改 Chrome 数据目录</span>
                    </div>
                    <span className="text-[11px] text-neutral-500 leading-tight">
                      {chromeDataDirFeedback
                        ? <span className="text-amber-400">✅ 已更新: {chromeDataDirFeedback.split('/').pop()}</span>
                        : '自定义 Chrome 调试实例的用户数据存放位置，隔离登录状态。'
                      }
                    </span>
                  </button>

                  {/* 打开工作空间 */}
                  <button
                    onClick={() => electronAPI.openWorkspaceFolder()}
                    className="group flex flex-col items-start gap-2 p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50 hover:border-emerald-600/50 hover:bg-emerald-950/20 transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-600/15 text-emerald-400 group-hover:bg-emerald-600/25 transition-colors">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-neutral-200 group-hover:text-emerald-300 transition-colors">打开工作空间</span>
                    </div>
                    <span className="text-[11px] text-neutral-500 leading-tight">
                      在系统文件管理器中打开存放所有短剧项目数据的根目录。
                    </span>
                  </button>

                  {/* 打开扩展文件夹 */}
                  <button
                    onClick={() => electronAPI.openExtensionFolder()}
                    className="group flex flex-col items-start gap-2 p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50 hover:border-violet-600/50 hover:bg-violet-950/20 transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-violet-600/15 text-violet-400 group-hover:bg-violet-600/25 transition-colors">
                        <Package className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-neutral-200 group-hover:text-violet-300 transition-colors">打开扩展文件夹</span>
                    </div>
                    <span className="text-[11px] text-neutral-500 leading-tight">
                      定位 Chrome 扩展程序目录，方便手动加载或调试 Viral Shorts Extension。
                    </span>
                  </button>

                  {/* 修改工作空间路径 */}
                  <button
                    onClick={() => electronAPI.changeWorkspacePath()}
                    className="group flex flex-col items-start gap-2 p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50 hover:border-orange-600/50 hover:bg-orange-950/20 transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-orange-600/15 text-orange-400 group-hover:bg-orange-600/25 transition-colors">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-neutral-200 group-hover:text-orange-300 transition-colors">修改工作空间路径</span>
                    </div>
                    <span className="text-[11px] text-neutral-500 leading-tight">
                      迁移数据存储目录到新位置。更改后应用将自动重启。
                    </span>
                  </button>

                  {/* 检查更新 */}
                  <button
                    onClick={async () => {
                      if (updateChecking) return;
                      setUpdateChecking(true);
                      try { await electronAPI.checkForUpdates(); } finally { setTimeout(() => setUpdateChecking(false), 3000); }
                    }}
                    disabled={updateChecking}
                    className="group flex flex-col items-start gap-2 p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50 hover:border-blue-600/50 hover:bg-blue-950/20 transition-all text-left disabled:opacity-50 disabled:cursor-wait"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg bg-blue-600/15 text-blue-400 group-hover:bg-blue-600/25 transition-colors ${updateChecking ? 'animate-spin' : ''}`}>
                        <RefreshCw className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-neutral-200 group-hover:text-blue-300 transition-colors">
                        {updateChecking ? '正在检查...' : '检查更新'}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500 leading-tight">
                      立即连接 GitHub Releases 检查并下载最新版本。
                    </span>
                  </button>
                </div>

                {appVersion && (
                  <p className="text-xs text-neutral-600 text-center mt-4">
                    当前版本: <span className="text-neutral-500 font-mono">v{appVersion}</span>
                  </p>
                )}
              </>
            )}

            {/* 赞赏作者 */}
            <div className="mt-4 pt-4 border-t border-neutral-800">
              <button
                onClick={() => { setShowSystemSettings(false); setShowDonate(true); }}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-amber-500/80 hover:bg-amber-500/10 hover:text-amber-400 transition-colors font-medium"
              >
                <Coffee className="w-4 h-4" /> 请作者喝杯咖啡
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowSystemSettings(false)} className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors font-bold">
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 text-white">新建短剧项目</h2>
            <div className="mb-6">
              <label className="text-sm text-neutral-400 block mb-2">项目名称（将作为文件夹名称）</label>
              <input
                type="text"
                autoFocus
                className="w-full bg-black/60 border border-neutral-700 rounded-xl p-4 text-white text-lg focus:border-orange-500 focus:outline-none placeholder-neutral-600"
                placeholder="例如：鸭子职场风云"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 text-neutral-400 hover:text-white transition-colors rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? '创建中...' : '立项开工'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除项目"
        message={`确定要把「${deleteTarget || ''}」扔进回收站吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="再想想"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
