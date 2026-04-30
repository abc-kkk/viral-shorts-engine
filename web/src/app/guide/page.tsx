'use client';

import React, { useState } from 'react';
import { BookOpen, Globe, Terminal, LayoutDashboard, ArrowLeft, Monitor, Puzzle, ExternalLink, Shield, Sparkles, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Zap, Copy } from 'lucide-react';

function StepCard({ stepNumber, icon, title, children, accent = 'orange' }: {
  stepNumber: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  const accentColors: Record<string, string> = {
    orange: 'from-orange-500 to-amber-500',
    blue: 'from-blue-500 to-cyan-500',
    emerald: 'from-emerald-500 to-teal-500',
    purple: 'from-purple-500 to-violet-500',
    rose: 'from-rose-500 to-pink-500',
    amber: 'from-amber-500 to-yellow-500',
  };
  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
      <div className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accentColors[accent]} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
            {stepNumber}
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            {icon} {title}
          </h2>
        </div>
        <div className="text-neutral-300 space-y-4 pl-14">
          {children}
        </div>
      </div>
    </section>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl px-4 py-3 text-sm text-emerald-300">
      <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-amber-950/40 border border-amber-800/40 rounded-xl px-4 py-3 text-sm text-amber-300">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function FAQ({ question, children }: { question: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-neutral-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-neutral-200 hover:bg-neutral-800/50 transition-colors"
      >
        <span className="font-medium">{question}</span>
        {open ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-neutral-400 border-t border-neutral-800 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

function CopyLinkButton({ url, className }: { url: string; className: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button 
      onClick={() => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={className}
      title="复制网址并在调试浏览器中粘贴打开"
    >
      {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? '已复制' : '复制网址'}
    </button>
  );
}

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <a href="/" className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors" title="返回首页">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-500" /> 新手完全指南
            </h1>
            <p className="text-xs text-neutral-500">首次使用前，请完成以下 6 步配置</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">

        {/* Hero */}
        <div className="bg-gradient-to-br from-orange-950/40 to-amber-950/20 border border-orange-800/30 rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-extrabold mb-3">
            🎬 欢迎使用<span className="bg-gradient-to-r from-orange-400 to-amber-500 text-transparent bg-clip-text">绘梦漫剧</span>
          </h2>
          <p className="text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            本系统通过<strong className="text-neutral-200">「劫持网页流」</strong>技术，在您的本地浏览器中自动操作 Google 的 AI 大模型来免费生成剧本、图片、视频和配音。
            启动前需要完成以下 6 步初始化。<strong className="text-orange-400">全程不花一分钱 API 费用！</strong>
          </p>
        </div>

        {/* Video Tutorial */}
        <div className="bg-[#fb7299]/10 border border-[#fb7299]/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#fb7299]/20 flex items-center justify-center shrink-0">
              <Monitor className="w-6 h-6 text-[#fb7299]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">作者亲自录制的保姆级视频教程</h3>
              <p className="text-sm text-neutral-400">如果您是第一次使用，强烈建议先花几分钟看完视频，比看文字说明直观 100 倍！</p>
            </div>
          </div>
          <a href="https://www.bilibili.com/video/BV1waoDBXEwv" target="_blank" rel="noopener noreferrer" className="shrink-0 flex items-center gap-2 px-6 py-3 bg-[#fb7299] hover:bg-[#fb7299]/90 text-white font-bold rounded-xl transition-colors shadow-lg shadow-[#fb7299]/20">
            <ExternalLink className="w-4 h-4" /> 去 B 站观看
          </a>
        </div>

        <Tip>
          <strong>桌面版更新提示：</strong>Windows 客户端用户，请在屏幕右下角任务栏的引擎小图标上<strong>右键点击</strong>，选择<strong>「检测更新」</strong>，以确保您使用的是最新版本。
        </Tip>

        {/* Step 1 */}
        <StepCard stepNumber={1} icon={<Monitor className="w-5 h-5 text-blue-400" />} title="启动 CDP 调试浏览器" accent="blue">
          <p>
            为了让后端的自动化脚本能够接管浏览器，Chrome 必须以 <strong className="text-white">远程调试 (CDP)</strong> 模式启动。
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-neutral-400">
            <li><strong className="text-white">完全退出</strong>当前正在运行的所有 Chrome 窗口。</li>
            <li>在系统状态栏的托盘图标中，点击 <strong className="text-white">「🌐 启动调试 Chrome」</strong>。</li>
            <li>一个新的 Chrome 窗口会自动弹出，这就是您的<strong className="text-white">专属调试浏览器</strong>。</li>
          </ol>

          <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/50 mt-4">
            <div className="font-bold text-white text-sm flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 验证是否装配成功
            </div>
            <p className="text-xs text-neutral-400">
              在新弹出的调试浏览器地址栏中，输入并访问 <code className="bg-neutral-900 px-1.5 py-0.5 rounded text-orange-300">http://127.0.0.1:9222/json/version</code>。如果网页能显示出一串带有浏览器版本号的英文代码，就说明装配成功了！如果显示“无法访问此网站”，请彻底退出当前所有打开的 Chrome 窗口后重试。
            </p>
          </div>

          <Tip>
            如果您想将调试浏览器的数据（登录状态等）与日常浏览器隔离，可以在托盘菜单中点击 <strong>「⚙️ 更改 Chrome 数据目录」</strong> 指定一个独立的文件夹。
          </Tip>
        </StepCard>

        {/* Step 2 */}
        <StepCard stepNumber={2} icon={<Puzzle className="w-5 h-5 text-purple-400" />} title="安装「人机协同」Chrome 扩展" accent="purple">
          <p>
            我们专门手搓了一个 Chrome 扩展，用于在网页里<strong className="text-white">一键选取</strong>最佳素材并自动同步到系统。
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-neutral-400">
            <li>在托盘图标中，点击 <strong className="text-white">「📦 打开扩展文件夹」</strong>，系统会自动弹出文件夹。</li>
            <li>在调试浏览器中访问 <code className="bg-neutral-800 px-2 py-0.5 rounded text-orange-300 text-sm">chrome://extensions/</code></li>
            <li>打开右上角的 <strong className="text-white">「开发者模式」</strong> 开关。</li>
            <li>点击 <strong className="text-white">「加载已解压的扩展程序」</strong>，选择刚才弹出的扩展文件夹。</li>
            <li>安装成功后，您会在浏览器右上角看到扩展图标。</li>
          </ol>
          <Warning>
            每次更新客户端版本后，建议在 <code className="text-xs">chrome://extensions/</code> 中点击扩展卡片上的刷新按钮，确保扩展代码与客户端同步。
          </Warning>
        </StepCard>

        {/* Step 3 */}
        <StepCard stepNumber={3} icon={<Globe className="w-5 h-5 text-emerald-400" />} title="登录并打开三个 AI 网页（核心！）" accent="emerald">
          <p>
            系统通过自动化操作以下三个网页来完成 AI 创作。请在调试浏览器中<strong className="text-white">逐一打开并登录 Google 账号</strong>，且<strong className="text-rose-400">使用期间不要关闭它们</strong>！
          </p>

          <div className="space-y-3 mt-4">
            {/* Gemini */}
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 text-sm font-bold">G</div>
                  <div>
                    <div className="font-bold text-white text-sm">Google Gemini</div>
                    <div className="text-xs text-neutral-500">负责写剧本 / 生成台词（默认）</div>
                  </div>
                </div>
                <CopyLinkButton 
                  url="https://gemini.google.com/app"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-950/40 px-3 py-1.5 rounded-lg transition-colors"
                />
              </div>
              <p className="text-xs text-neutral-500 pl-11">gemini.google.com/app</p>
            </div>

            {/* Doubao */}
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-600/20 flex items-center justify-center text-sky-400 text-sm font-bold">豆</div>
                  <div>
                    <div className="font-bold text-white text-sm">豆包 Doubao <span className="text-[10px] text-neutral-500 font-normal ml-1.5 bg-neutral-800 px-1.5 py-0.5 rounded">可选替代</span></div>
                    <div className="text-xs text-neutral-500">可替代 Gemini 负责写剧本（国内网络友好）</div>
                  </div>
                </div>
                <CopyLinkButton 
                  url="https://www.doubao.com/chat"
                  className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 bg-sky-950/40 px-3 py-1.5 rounded-lg transition-colors"
                />
              </div>
              <p className="text-xs text-neutral-500 pl-11">doubao.com/chat · 进入项目设置(⚙️)可切换为豆包模式</p>
            </div>

            {/* AI Studio */}
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-400 text-sm font-bold">🎙</div>
                  <div>
                    <div className="font-bold text-white text-sm">Google AI Studio (TTS)</div>
                    <div className="text-xs text-neutral-500">负责生成角色配音</div>
                  </div>
                </div>
                <CopyLinkButton 
                  url="https://aistudio.google.com/generate-speech?model=gemini-3.1-flash-tts-preview"
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 px-3 py-1.5 rounded-lg transition-colors"
                />
              </div>
              <p className="text-xs text-neutral-500 pl-11">aistudio.google.com/generate-speech</p>
            </div>

            {/* Flow */}
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 text-sm font-bold">🎨</div>
                  <div>
                    <div className="font-bold text-white text-sm">Google Labs Flow</div>
                    <div className="text-xs text-neutral-500">负责生图 / 生视频 (Nano Pro & Veo 3.1)</div>
                  </div>
                </div>
                <CopyLinkButton 
                  url="https://labs.google/fx/zh/tools/flow"
                  className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 bg-purple-950/40 px-3 py-1.5 rounded-lg transition-colors"
                />
              </div>
              <p className="text-xs text-neutral-500 pl-11">labs.google/fx/zh/tools/flow · 进入项目「设置」后，将您的 Flow 项目 URL 粘贴到「Flow 地址」字段中</p>
            </div>
          </div>

          <Warning>
            请确保三个网页都已 <strong>登录同一个 Google 账号</strong>。如果未登录，自动化脚本将无法执行任何操作。
          </Warning>
        </StepCard>

        {/* Step 4 */}
        <StepCard stepNumber={4} icon={<Shield className="w-5 h-5 text-rose-400" />} title="配置网络环境（防封禁）" accent="rose">
          <p>
            由于大量自动化调用 Google 接口，您的 IP 有可能被识别为异常活动 (UNUSUAL_ACTIVITY)。建议配置以下任一防封禁方案：
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-400">
            <li><strong className="text-white">方案 A（推荐）：</strong>开启 <strong>Cloudflare WARP</strong> 全局代理，获取干净的住宅级 IP。</li>
            <li><strong className="text-white">方案 B（极客级）：</strong>使用 GitHub Codespace + SSH 隧道搭建 SOCKS5 代理。详见项目文档 <code className="text-xs bg-neutral-800 px-1.5 py-0.5 rounded">docs/codespace-warp-proxy-guide.md</code></li>
            <li><strong className="text-white">方案 C（临时）：</strong>使用自己的全局科学上网工具，但需确保 IP 质量较好。</li>
          </ul>
          <Tip>
            如果暂时不配置代理也能正常访问 Google 服务，可以先跳过此步。等到出现「UNUSUAL_ACTIVITY」报错时再回来处理。
          </Tip>
        </StepCard>

        {/* Step 5 */}
        <StepCard stepNumber={5} icon={<Zap className="w-5 h-5 text-amber-400" />} title="了解制片流水线" accent="amber">
          <p>配置完成后，回到首页点击「新建项目」，您将进入 <strong className="text-white">4 步制片流水线</strong>：</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/30">
              <div className="font-bold text-orange-400 text-sm mb-1">① 剧本室</div>
              <p className="text-xs text-neutral-500">输入一句话脑洞 → AI 自动生成完整的极限反转剧本，并分配角色音色。</p>
            </div>
            <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/30">
              <div className="font-bold text-blue-400 text-sm mb-1">② 定妆室</div>
              <p className="text-xs text-neutral-500">生成角色「定妆照」作为全局锚点，杜绝后续画面「AI 变脸」。</p>
            </div>
            <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/30">
              <div className="font-bold text-purple-400 text-sm mb-1">③ 画板区</div>
              <p className="text-xs text-neutral-500">中英双语对照分镜 → 自动去 Flow 生成首帧图 + Veo 3.1 视频。</p>
            </div>
            <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/30">
              <div className="font-bold text-emerald-400 text-sm mb-1">④ 渲染室</div>
              <p className="text-xs text-neutral-500">自动配音 + 进度条打点 + Remotion 导出 4K 成片！</p>
            </div>
          </div>
        </StepCard>

        {/* Step 6 - FAQ */}
        <StepCard stepNumber={6} icon={<BookOpen className="w-5 h-5 text-blue-400" />} title="常见问题 (FAQ)" accent="blue">
          <div className="space-y-3">
            <FAQ question="生图/生视频频繁失败怎么办？">
              <p>这通常是浏览器缓存导致的。在 Chrome 中按 <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-xs">⇧⌘⌫</code> (Mac) 或 <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-xs">Ctrl+Shift+Delete</code> (Win)，清空缓存后刷新 Flow 网页即可。</p>
            </FAQ>
            <FAQ question="提示「UNUSUAL_ACTIVITY」被 Google 封禁了？">
              <p>请配置第 4 步中的代理方案。推荐使用 Cloudflare WARP 获取干净 IP。清除浏览器 Cookie 后重新登录 Google 账号也可能有效。</p>
            </FAQ>
            <FAQ question="如何修改 AI 的提示词风格？">
              <p>在首页左侧边栏进入「提示词中心」，可以可视化编辑 11 个核心提示词模板。注意：你修改的是发给「导演 AI」的指令，而非直接控制生图模型。</p>
            </FAQ>
            <FAQ question="Chrome 扩展里的「Push to Studio」按钮是干什么的？">
              <p>当 Flow 生成了多张图或视频后，你可以在网页里手动挑选最满意的一张，右键选择「Push to Studio」。扩展会自动下载该素材并同步到当前项目文件夹中。这就是我们的「人机协同」抽卡机制！</p>
            </FAQ>
            <FAQ question="我的调试浏览器数据会和日常浏览器冲突吗？">
              <p>不会。通过托盘菜单的「更改 Chrome 数据目录」，可以让调试浏览器使用独立的用户配置文件，与日常浏览完全隔离。</p>
            </FAQ>
          </div>
        </StepCard>

        {/* CTA */}
        <div className="text-center py-8">
          <a href="/" className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-900/30 hover:scale-105 hover:-translate-y-0.5">
            <CheckCircle2 className="w-5 h-5" />
            配置完毕，去新建项目！
          </a>
        </div>
      </div>
    </div>
  );
}
