'use client';

import React, { useState, useEffect } from 'react';
import { X, Globe, MonitorCog, FolderOpen, Package, HardDrive, RefreshCw, Coffee } from 'lucide-react';

interface SystemSettingsModalProps {
  onClose: () => void;
  onOpenDonate: () => void;
  globalSettings: {
    aiProvider: string;
    minimaxApiKey: string;
    jianyingPath: string;
    flowUrl: string;
    imageModel: string;
    videoModel: string;
    proxyUrl: string;
  };
  updateGlobalSetting: (key: string, value: string) => void;
}

export default function SystemSettingsModal({
  onClose,
  onOpenDonate,
  globalSettings,
  updateGlobalSetting,
}: SystemSettingsModalProps) {
  const [appVersion, setAppVersion] = useState('');
  const [chromeLaunching, setChromeLaunching] = useState(false);
  const [chromeDataDirFeedback, setChromeDataDirFeedback] = useState('');
  const [updateChecking, setUpdateChecking] = useState(false);

  const electronAPI = typeof window !== 'undefined' && (window as any).electronAPI?.isElectron ? (window as any).electronAPI : null;

  useEffect(() => {
    if (electronAPI) {
      electronAPI.getAppVersion?.().then((v: string) => setAppVersion(v || ''));
    }
  }, [electronAPI]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">⚙️ 系统设置</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 mb-8">
          {/* AI Provider */}
          <div>
            <label className="text-sm font-bold text-neutral-300 block mb-2">🧠 全局文本大模型 (AI Provider)</label>
            <select 
              className="w-full bg-black/60 border border-neutral-700 rounded-lg p-3 text-neutral-300 font-bold text-sm focus:border-amber-500 focus:outline-none cursor-pointer"
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
                  className="w-full bg-black/60 border border-neutral-700 rounded-lg p-3 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
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
              className="w-full bg-black/60 border border-neutral-700 rounded-lg p-3 text-neutral-300 font-bold text-sm focus:border-amber-500 focus:outline-none cursor-pointer"
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
              className="w-full bg-black/60 border border-neutral-700 rounded-lg p-3 text-neutral-300 font-bold text-sm focus:border-amber-500 focus:outline-none cursor-pointer"
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
              className="w-full bg-black/60 border border-neutral-700 rounded-lg p-3 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
              value={globalSettings.jianyingPath}
              onChange={e => updateGlobalSetting('jianyingPath', e.target.value)}
              placeholder="留空则使用默认路径 (%LOCALAPPDATA%\JianyingPro\...)"
            />
            <p className="text-xs text-neutral-600 mt-1.5">如果你在剪映的“全局设置”里把“草稿位置”移到了别的盘，请在这里填入你的自定义文件夹路径。</p>
          </div>

          <div className="h-px bg-neutral-800 w-full" />

          {/* Proxy URL */}
          <div>
            <label className="text-sm font-bold text-neutral-300 block mb-2">🌐 全局网络代理 (HTTP/HTTPS Proxy)</label>
            <input 
              type="text"
              className="w-full bg-black/60 border border-neutral-700 rounded-lg p-3 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
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
            onClick={() => { onClose(); onOpenDonate(); }}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-amber-500/80 hover:bg-amber-500/10 hover:text-amber-400 transition-colors font-medium"
          >
            <Coffee className="w-4 h-4" /> 请作者喝杯咖啡
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors font-bold">
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
