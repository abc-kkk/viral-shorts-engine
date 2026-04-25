# Viral Shorts Engine v5.0 (反差奇观/怪诞写实引擎) - AI 交接文档

> **⚠️ 致下一位 AI 助手的特别叮嘱 (To the Next AI Assistant):**
> 
> 你正在协助一位顶级的创意总监。请务必遵循以下**核心开发哲学**：
> 1. **一次只做一件事 (Microscopic Workflow)**：永远不要让 AI 一次性生成"角色+分镜+视频"。一定要把任务拆解成最细粒度的微调工作流（先写好台词，再想长相，最后抠画面，最后拼视频）。
> 2. **中文优先**：所有的 Prompt 输出及系统 UI 界面必须是简体中文，确保用户体验顺畅（但在幕后发送给生图/视频模型的 Prompt 必须是纯英文）。
> 3. **临时模型接管提示 (Temporary Gemini Takeover)**：由于特殊需求评估，目前的剧本与提示词引擎已在 `generate-prompts/route.ts` 中通过 `FORCE_GEMINI = true` 全面切换为 **Gemini Web Automator（走无头浏览器自动拉取）**。原本的 `MiniMax-M2.7` 逻辑已被物理保留在底层的 `else` 块中。如果你想切回，只需把那个布尔值改为 false 即可。
> 4. **禁止重新发明对口型(Lip-Sync)**：我们在之前的迭代中果断排除了"强制让动物对口型"的尝试。我们采用"原声前置延迟发车 + 强烈情绪配音 + 画板张嘴运镜指令"来让大脑自行完形填空。绝不允许再加回花里胡哨的唇音同步 API！

---

## 零、 工程架构 (Project Architecture) [v5.0]

项目采用 **React Context + 组件化** 分层架构，支持**多项目独立工作空间**。

### 前端路由：

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 项目列表 | 首页，项目卡片网格 + 新建弹窗 |
| `/studio/[projectId]` | 制片工作台 | Phase 1-4 完整流水线 |
| `/prompt-studio` | 提示词管理中心 | 可视化编辑 11 个核心提示词模板 |
| `/scene-lab` | 定制化绘图工作台 | 拼装参考图 + 提示词 → 发送到 Flow |
| `/scene-lab/editor` | 3D 布局编辑器 | 拖拽桌椅摆放构图，截图保存预设 |

### 目录结构：

```
src/
├── app/
│   ├── page.tsx                  # 首页 → 项目列表
│   ├── studio/[projectId]/
│   │   └── page.tsx              # 制片工作台（接收 URL 中的 projectId）
│   ├── prompt-studio/page.tsx    # 提示词管理中心入口
│   ├── scene-lab/
│   │   ├── page.tsx              # 定制化绘图工作台
│   │   └── editor/page.tsx       # 3D 布局编辑器入口
│   └── api/
│       ├── projects/route.ts     # GET=列表 POST=立项
│       ├── projects/[projectId]/ # DELETE=回收站 PATCH=重命名
│       ├── serve/[...path]/      # 文件服务代理（从工作空间读取资源）
│       ├── state/route.ts        # 项目状态 CRUD（?projectId=xxx）
│       ├── generate-prompts/     # 剧本/提示词生成（走模板引擎）
│       ├── generate-assets/      # Playwright Flow 自动化生图/视频
│       ├── generate-voice/       # Playwright AI Studio TTS 配音
│       ├── prompt-templates/     # 提示词模板 CRUD API
│       ├── layouts/route.ts      # 布局预设 CRUD（存储在 _layouts/ 目录）
│       └── export/               # Remotion CLI 离线渲染导出
├── components/
│   ├── ProjectList.tsx           # 项目卡片网格 + 新建弹窗
│   ├── PhaseNav.tsx              # 顶部导航：← 返回 | 项目名 | 阶段 | ⚙️ 设置 | 清空
│   ├── GlobalSettings.tsx        # 设置弹窗（项目重命名 + Flow URL + 画风）
│   ├── WriterRoom.tsx            # Phase 1: 剧本室
│   ├── CastingRoom.tsx           # Phase 2: 定妆室（含布局预设 + 角色设定图）
│   ├── StoryboardPanel.tsx       # Phase 3: 画板区
│   ├── RenderRoom.tsx            # Phase 4: Remotion 渲染室
│   ├── PromptEditor.tsx          # 提示词模板可视化编辑器
│   └── scene-lab/
│       └── SceneLabEditor.tsx    # Three.js 3D 布局编辑器（拖拽家具）
├── lib/
│   ├── types.ts                  # Character / ScriptLine / ProjectState
│   ├── constants.ts              # VOICE_OPTIONS / ART_STYLE_PRESETS
│   ├── ProjectContext.tsx        # 🧠 全局状态管理 Context
│   ├── db.ts                     # 工作空间文件系统操作
│   ├── prompts/
│   │   ├── defaultTemplates.ts   # 11 个内置提示词模板（Source of Truth）
│   │   ├── promptStore.ts        # 模板持久化存储 + 自动升级合并
│   │   └── templateEngine.ts     # {{变量}} 渲染引擎
│   └── tools/
│       ├── flow-automator.ts     # Google Flow CDP 自动化
│       └── aistudio-automator.ts # AI Studio TTS CDP 自动化
└── remotion/                     # Remotion 渲染组件（不变）
```

### 核心架构原则：

1. **`ProjectContext.tsx` 是大脑**：所有状态和业务函数集中管理，UI 组件通过 `useProject()` 获取。
2. **`projectId` 贯穿全栈**：从 URL → Context → API → db.ts → 文件系统。
3. **代码与资源完全分离**：代码在 `viral-shorts-engine/`，资源在外部工作空间（见下方）。

---

## 一、 多项目工作空间 (Multi-Project Workspace) [v5.0 核心]

### 工作空间配置

在 `.env.local` 中配置：
```
WORKSPACE_PATH=/Users/ios/Desktop/work-data/短剧项目
```

### 项目文件夹结构

**立项时自动创建**（文件夹名 = 中文项目名）：

```
/Users/ios/Desktop/work-data/短剧项目/
├── 鸭子职场风云/
│   ├── project.json              ← 项目完整状态（剧本、角色、分镜数据全在这）
│   ├── scripts/                  ← 剧本快照
│   ├── images/                   ← 定妆照 + 分镜首帧图
│   ├── videos/                   ← Veo 3.1 视频片段
│   ├── audio/                    ← Gemini TTS 配音 (.wav)
│   └── exports/                  ← Remotion 导出成片
├── 猫咪CEO日记/
│   └── ...
```

### 项目管理功能

| 操作 | 入口 | 实现 |
|------|------|------|
| **立项** | 首页「+ 新建项目」 | 创建文件夹 + 子目录 + project.json |
| **重命名** | 设置弹窗 ⚙️ → 项目名称 ✏️ | 重命名文件夹 + 更新 project.json + 自动跳转新 URL |
| **删除** | 项目卡片 hover → 🗑️ | 移到 macOS 废纸篓（可恢复） |

### 资源服务机制

- 浏览器无法直接访问工作空间路径的本地文件
- 通过 `/api/serve/[...path]` API 代理：`/api/serve/鸭子职场风云/images/casting_001.png`
- 自动识别 MIME 类型（png/mp4/wav 等），长缓存
- 内置目录穿越防护（禁止 `..` 路径）

---

## 二、 导演级工作台 (Director-Grade AI Studio)

**人工强介入的 4 步骤制片流水线**：

1. **剧本室 (Writer's Room)** → `WriterRoom.tsx`
   - MiniMax 从一句话脑洞生成极限反转剧本
   - **单场极简铁律**：单句台词 ≤ 5 秒，长台词必须拆多幕
   - 角色音色（Gemini TTS）在此绑定，一次定音全片通用

2. **定妆室 (Casting Room)** → `CastingRoom.tsx`
   - 提取角色外貌中文 Prompt → `Nano Banana Pro` 生成定妆照
   - **角色设定图系统 (Character Design Sheet)**：支持从单人全身照切换到多视图模式（三视图、表情设定集、比例设定、动作设定），通过 `{{sheetElements}}` 注入 `character_prompt` 模板
   - **布局预设库 (Layout Preset Gallery)**：集成 Scene Lab 3D 编辑器，可在 3D 场景中拖拽桌椅摆放构图，保存为预设（存储在 `_layouts/` 目录），支持在多个项目间复用。选中预设后自动将物体描述注入 `{{sceneComposition}}` 场景提示词
   - 定妆照 = 全局锚点，杜绝后续基因突变

3. **画板区 (Storyboard)** → `StoryboardPanel.tsx` [最核心]
   - **中英双语对照长廊 (Dual-Pane UI)**：界面全面拓宽，左侧显示喂给底层的极度严谨纯英文咒语，右侧同屏显示精确的中文语义对照，让导演一秒检阅 AI 分镜逻辑是否合理。
   - **多角色防闪避**：准确提取 `characters_in_scene`，并联挂载参考图
   - **解耦式生图**：首图(Nano Pro) → 视频(Veo 3.1) 两步走

4. **渲染室 (Remotion Cut)** → `RenderRoom.tsx`
   - 绝密潜入 AI Studio 获取 Gemini TTS 配音
   - **所见即所得打点仪**：拖动视频进度条 → 一键标记起声延迟

---

## 三、 人机协同架构 (Human-in-the-Loop Chrome Extension) [v5.5 首创]

为了彻底突破 Google Labs 苛刻的封控机制，同时让创作者有挑选最好素材的权利，我们开发了伴随式 Chrome 插件 (`viral-shorts-extension`)。

这是本引擎**最推荐的工作流**：
1. **一键发车 (Fire-and-Forget)**：在 Studio 点击生成后，服务器不再使用 Headless 模式死等结果，而是把 Prompt 填好、选好芯片后立刻交还控制权。
2. **人工抽卡**：创作者在原生 Chrome 浏览器里舒适地抽卡，挑选最完美的一张结果。
3. **一键飞跃**：在选中的图片或视频上点击右键（或使用插件面板），选择 `Push to Studio`。
4. **无缝落盘同步**：扩展会抓取高清资源，自动通过本地 Inbox 桥接器 (`/api/extension/inbox`) 发给 Studio，React 界面瞬间渲染出该素材并自动将文件存入当前项目文件夹！

---

## 四、 底层通讯引擎 (Playwright CDP Flow Automator)

`src/lib/tools/flow-automator.ts` 以及 `src/lib/tools/aistudio-automator.ts`

- **SOCKS5 隧道抗封禁 (WARP 极客级白嫖隧道)**：
  因为单纯的云端机房 IP 会 100% 被 Google 大模型接口（UNUSUAL_ACTIVITY）拦截，本项目创新性地采用了 **GitHub Codespace + Cloudflare WARP** 双重跳板架构。
  - **网络拓扑**：本机的 Playwright 流量 → 本地 `1081` 端口 → 经 SSH 发送到 Codespace 云桌面 → 经云桌面运行的 `warp-svc` 发给 Cloudflare 骨干网 → 直通 Google。
  - **一键启动**：我们封装了 `start-proxy.sh`，开发前只需跑一下这个脚本即可全自动在后台拉起抗封禁网络隧道。详细说明请见 `docs/codespace-warp-proxy-guide.md`。
- **行内芯片注入系统 (Inline Token Injection)**：【v5.0 突破级创新】
  彻底打破“先上传文字再加图片”的传统机械 UI 自动化。脚本会通过解析 `{@阿柴}` 语法，在像人一样打字的过程中，无缝插播 `@` 快捷键并秒回车选中默认高亮的首个资产库芯片。实现了人机合一的提示词 + 图像变量多重组装。
- **动态寻址与隔空取物**：Flow 网址在设置弹窗中动态配置；完全抛弃跨端失效的 `download.saveAs()`，改用原生抓取流强行吸回生成的媒体文件。

---

## 五、 萌宠发疯文学与污染隔离铁律 (Cute Meme & Concept Isolation Rules)

我们在经历多次风格迭代后，目前引擎已全面切换为**“二次元/萌宠发疯文学”**模式。以下是当前内核的【不可触碰的提示词铁律】：

1. **激萌与发疯的极致反差 (Meme Contrast)**：
   - 引擎底层已强制挂载 `Pop Mart, Chibi, Cute Anime` 等词条。主角必须拥有激萌可爱的外表。
   - 剧本被限制为【单一场景】和极快节奏的对白。利用“可爱的角色做出拔枪、掀桌等暴力生草行为”来拉满视觉反差和 Meme 属性。
2. **定妆“图生图”污染隔离**：
   - **唯一定理 (Single View Rule)**：给下游作为视频锚点（Anchor）的定妆参考照，【严禁要求画三视图】！必须且只能生成一张正规的全身大像 (`exactly ONE single character`)。
   - **双手干净原则 (No Props Rule)**：定妆照绝不允许手持任何带有剧情属性的道具（比如手持 AK-47、戴黑头套）。【定妆照只负责长相】，一切“戴头套、拿枪”的动作必须由后续的 Veo 视频分镜引擎在场景中动态生成。否则 AI 会把 AK-47 物理“焊死”在主角身上导致严重的连续性 Bug。
3. **正常对口型与动作配合 (Lip-sync Enabled)**：
   - 因为全面回归了长着嘴巴的二次元/萌宠角色，系统已重新允许 Veo 3.1 进行自然的对口型（Lip-sync）。分镜描述中可以正常加入嘴巴动作。
4. **全局场景强制锚定 (Global Scene Anchoring)**：
   - 为了解决“人物换镜头时背景乱飘”的世纪难题，引擎引入了 `{@场景}` 黑魔法。定妆室会基于剧本生成一张“极致扁平、单帧、空无一人”的纯背景图。后续分镜的运镜提示词会被强制插入 `{@场景}` 标签，死死钉住画面背景的物理空间。
5. **对口型与防“粉红大象”原则 (Lip-sync & Motion Control)**：
   - **点名对口型**：如果这一幕有角色说话，分镜提示词必须在 `Audio:` 标签前，明确写出“XXX 张开嘴大声说”，否则 Veo 会张冠李戴搞错对口型的人选。
   - **对抗“粉红大象”效应**：如果需要角色拿枪威慑但“绝对不能开火”，提示词里【严禁】出现 "DO NOT SHOOT", "NO MUZZLE FLASH" 等负面攻击性词汇。必须使用纯正向的静止指令，如 "completely motionless", "frozen like a statue"，否则 AI 会被刺激到强行开火。
6. **抖音爆款同款滤镜字幕 (TikTok-Style Subtitles)**：
   - 恢复了 Remotion 引擎底层的字幕覆写系统。采用大字号、粗体黑底加阴影的类抖音爆款视觉设计，并配合毛玻璃半透明黑底背板，保证在任何极端复杂的背景下字幕都清晰可见，同时去掉了累赘的“角色名：”前缀。

---

## 六、 本地资源优先原则 (Local Asset Doctrine)

- **禁止留存云端签名链接**：Google Cloud URL 数小时后过期
- **下载拦截**：API 截获云端 URL 后第一时间落盘到项目 `images/` `videos/` `audio/`
- **零卡顿回放**：Remotion 只用本地相对路径（通过 `/api/serve/` 代理）

---

## 七、 字卡引擎 (Intertitle Engine)

- 人物为 `字卡` 的场次 → 无需生成画面，直接渲染全黑背景 + 白字
- `SkitVideo.tsx` 层原生拦截处理，零 API 消耗

---

## 八、 提示词模板引擎 (Prompt Template Engine) [v6.0 新增]

### 核心架构

提示词系统由三层组成：

| 层级 | 文件 | 职责 |
|------|------|------|
| **默认模板** | `lib/prompts/defaultTemplates.ts` | 11 个内置模板的 **Source of Truth**，代码级定义 |
| **持久化存储** | `lib/prompts/promptStore.ts` | 读写 `_prompt_templates/templates.json`，实现用户自定义覆盖 |
| **渲染引擎** | `lib/prompts/templateEngine.ts` | 将 `{{变量}}` 占位符替换为运行时上下文值 |

### ⚠️ 模板合并机制（开发者必读）

`promptStore.ts` 中的 `getAllTemplates()` 使用 **"Merge-on-Load"** 策略：
1. 优先返回磁盘缓存的用户版本
2. **自动升级检测**：如果代码中的默认模板新增了 `variables`（如新增 `sheetElements`），而磁盘缓存的旧版本缺少这些变量，系统会自动用新默认模板覆盖旧缓存
3. 控制台日志：`[PromptStore] 内置模板 "xxx" 检测到新增变量，自动升级模板。`

**给开发者的忠告**：如果你在 `defaultTemplates.ts` 中修改了内置模板的 `systemPrompt` 但没有新增 `variables`，磁盘缓存**不会自动更新**。此时用户需要在 Prompt Studio 里手动「重置为默认」。如果你同时新增了 variable，则会自动升级。

### 11 个内置模板 ID

| ID | 功能 | 关键变量 |
|----|------|----------|
| `script_prompt` | 剧本生成 | `{{theme}}` |
| `character_prompt` | 角色外貌提取 | `{{sheetElements}}` |
| `location_prompt` | 场景空镜生成 | `{{sceneComposition}}` |
| `cover_prompt` | 海报封面 | — |
| `scene_image_prompt` | 分镜画面 | `{{sceneIndexPlusOne}}` |
| `scene_start_image_prompt` | 首帧图 | — |
| `scene_video_prompt` | 视频动态描述 | — |
| `bgm_prompt` | 背景音乐 | — |
| `creative_director_prompt` | 创意总监 | `{{creativeMode}}` |
| `scene_image_refine_prompt` | 画面精修 | `{{userDirection}}` |
| `scene_video_refine_prompt` | 视频精修 | `{{userDirection}}` |

---

## 九、 布局预设系统 (Layout Preset System) [v6.0 新增]

### 存储

布局预设保存在工作空间的 `_layouts/` 目录下（跨项目共享）：

```
/Users/ios/Desktop/work-data/短剧项目/
├── _layouts/
│   ├── layout_1713859200000.json   # 每个预设一个 JSON 文件
│   ├── layout_1713859300000.json
│   └── ...
├── _prompt_templates/
│   └── templates.json              # 提示词模板持久化
├── 鸭子职场风云/
│   └── ...
```

### 预设 JSON 结构

```json
{
  "id": "layout_1713859200000",
  "name": "办公室-桌椅对坐",
  "objects": [
    { "id": "char_1", "type": "character", "position": [-1, 0, 0], "label": "男主", ... },
    { "id": "obj_xxx", "type": "table", "position": [0, 0, 0], "label": "桌子", ... }
  ],
  "image": "data:image/png;base64,...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### API 端点

| 方法 | 路径 | 功能 |
|------|------|------|
| `GET` | `/api/layouts` | 列出所有预设（按更新时间倒序） |
| `POST` | `/api/layouts` | 创建或更新预设 |
| `DELETE` | `/api/layouts?id=xxx` | 删除指定预设 |

### 3D 编辑器参数

Scene Lab 编辑器通过 URL 参数控制行为：

| 参数 | 说明 |
|------|------|
| `returnUrl` | 保存后跳转的目标页面（从定妆室打开时传入 `/studio/xxx`） |
| `presetId` | 加载已有预设进行编辑（从预设库点「编辑」时传入） |

---

## 十、 当前状态
项目已完成模块化解耦、多项目工作空间架构、提示词可视化管理、布局预设库、角色设定图系统。可以开始疯狂批发出片。

---

## 十一、 架构演进与重构 (Architecture Evolution) [v6.1]

随着项目规模增长（8000+ 行代码），我们进行了系统性的架构治理，以解决"改这边坏那边"的脆弱性问题：

### 1. 资源管理标准化 (TargetType & assetUrl)
所有与生图/生视频相关的文件名、缓存破坏和 URL 构建，已被**彻底收拢**：
- **`lib/types.ts`**：`TargetType` 联合类型是资源目标的**唯一真相源**。新增目标类型必须在这里和 `TARGET_TYPE_CONFIG` 中注册。
- **`lib/assetUrl.ts`**：所有确定性文件名的生成 (`generateAssetFilename`) 和防缓存 (`getAssetUrlWithCacheBust`) 逻辑全部在此模块。**绝对禁止**在 API 路由中硬编码 `Math.random()` 或拼接文件名。

### 2. 全局状态解耦 (ProjectContext 拆分)
曾经高达 1000+ 行的 `ProjectContext.tsx`（上帝对象）已被拆分为多个按 Phase 分层的职责单一的 Hooks：
- `ProjectProvider.tsx`: 顶层容器
- `useProjectState.ts`: 基础状态和设置
- `useWriterRoom.ts` / `useCastingRoom.ts` / `useStoryboard.ts` / `useRenderRoom.ts`: 各阶段业务逻辑
- `useInboxPoller.ts`: 独立的 Chrome 扩展数据轮询器
**开发规范**：新增业务逻辑时，必须放入对应的专属 Hook 中，严禁再次将 `ProjectProvider` 搞成巨无霸。

### 十二、 Chrome Extension 的 TypeScript 与安全规约 (Extension Architecture) [v6.2]

为了解决浏览器端扩展代码中 `targetType` 与 Web 后端 API 类型定义（Single Source of Truth）不同步的问题，我们已将 `viral-shorts-extension` 彻底迁移至 TypeScript 编译架构。

#### 1. Type-only Import 魔法与零打包器
我们没有使用沉重的 Webpack/Vite 来构建单文件的 Content Script。
- 扩展源码位于 `web/viral-shorts-extension/src/content.ts`。
- 代码中通过 `import type { TargetType } from '../../src/lib/types';` 进行纯类型引用。
- 这样，TS 编译器会在编码阶段强制校验扩展中的 `targetType` 分支是否涵盖了后端的枚举字典，一旦后端新增资源类型而扩展没改，编译就会立刻报错。而在编译生成 `dist/content.js` 时，这个 `import` 语句会被自动擦除，保证了浏览器端原生的兼容性。

#### 2. ESBuild 构建与产物隔离
由于跨目录引用的行为会导致 `tsc` 生成深层嵌套文件夹，我们引入了 `esbuild` 作为高速构建管线：
`tsc -p tsconfig.json && esbuild src/content.ts --bundle --outfile=dist/content.js`
这保证了 `manifest.json` 能够简单干净地指向 `dist/content.js`。
**开发者注意**：任何对扩展的修改都必须在 `src/content.ts` 中进行，修改后运行全项目的 `npm run build` 或专门的 `npm run build:ext` 即可自动编译生效。必须在 Chrome 中重新加载该扩展文件夹。

### 十三、 API 网关的透传机制 (Pass-through Meta Architecture) [v6.3]

为了解决高并发下读取 `tmp/active-context.json` 临时文件导致的严重竞争态 Bug，我们重构了 Next.js API 与 `ai-gateway` 之间的通讯链路：
- **废除临时文件猜取**：`generate-assets/route.ts` 不再从本地文件系统猜测当前的任务，而是直接由前端 Hooks 明确传入 `targetType`, `index`, `meta` 等完整上下文。
- **透明网关传递 (passthroughMeta)**：在调用 `ai-gateway` 生图接口时，这些上下文被打包为 `passthroughMeta` 交给网关。网关内部不关心这些业务逻辑，但在完成 Playwright 流程（成功、失败、或后台 FireAndForget 挂起）返回响应时，会将 `passthroughMeta` 原样弹回。
- 这项重构让后端生图彻底无状态化，极大提升了多任务并发生图时的落盘稳定性。*(注：Chrome 扩展依然会读取 `active-context` 以实现人工抽卡时的快速防伪名填充，但这已与后端核心落盘逻辑完全解耦。)*

### 十四、 Prisma + SQLite 动态本地数据库与增量同步机制 [v6.4]

为了彻底解决长久以来基于 `project.json` 全量写入引发的数据损坏（文件系统读写竞争）问题，我们在架构中全面引入了 Prisma 7 与 SQLite，并将存储策略改为了“本地零负担关系型模型”。

#### 1. 动态绑定的外部 SQLite 存储
- 数据库文件并没有随代码提交在仓库中。我们使用了 Prisma 7 的 `@prisma/adapter-better-sqlite3` 动态适配器，在运行时将 SQLite 数据库文件 (`viral-shorts.db`) 生成在 `WORKSPACE_PATH` （即用户的“短剧项目”外部文件夹）中。
- 这样实现了**代码与资产的绝对隔离**。用户只要备份工作空间文件夹，就能同时备份图片、视频、和**涵盖所有项目剧本的整库数据**。
- `package.json` 中的 `postinstall` 钩子会在其他用户拉取项目执行 `npm install` 时，自动运行 `npx prisma db push --accept-data-loss`，为新用户自动完成初始化建库，无需配置外部云数据库。

#### 2. “补丁 (PATCH) 式”并发写策略与热迁移
- **精准差异更新 (Deep Diff)**：前端 `useProjectState.ts` 不再粗暴地每秒向服务器发送包含几十个变量的完整庞大状态。现在它通过对比 `useRef` 缓存，计算出真正改变了的字段 (Diff)。API 端改为 `PATCH /api/state` 接收增量对象，并在 Node.js 内存中利用 `lodash/merge` 与旧状态深度合并，最后通过 Prisma 的单一事务写入多张关系表 (`Project`, `Character`, `Scene`) 中。这就实现了并发修改互相不干扰（例如同时修改第一幕台词与推送第二幕的配图）。
- **无感热迁移 (Hot Migration)**：为了兼容旧项目，当后端 `db.ts` 扫描工作空间发现旧版 `project.json` 但在数据库中无此记录时，它会**全自动解析并倒库入表**，将老 JSON 改名为 `.bak` 备份，实现历史数据的透明升级。

### 十五、 开发者避坑指南 (Developer Gotchas) [血泪教训]

> **致未来的 AI 与开发者：以下错误已经在历史重构中发生过，请勿重蹈覆辙！**

#### 1. 动态数据库 Schema 推送陷阱
虽然 `package.json` 中的 `postinstall` 钩子会在 `npm install` 时向默认的 `./dev.db` 推送 Schema，但**系统真正在运行时，使用的是 `WORKSPACE_PATH` 里的 `viral-shorts.db`**！
- **错误示范**：如果你修改了 `schema.prisma`，然后傻乎乎地在开发环境跑了一句 `npx prisma db push`。
- **灾难后果**：这只会更新 `web` 目录下的空壳库，而你真实工作空间里的库根本没更新。API 调用时会直接报 `The table main.XXX does not exist in the current database`！
- **正确做法**：在开发阶段修改数据库结构后，**必须带上你的真实工作空间路径进行推送**，例如：
  `DATABASE_URL="file:/Users/ios/Desktop/work-data/短剧项目/viral-shorts.db" npx prisma db push`。

#### 2. 提示词模板反引号 (Backtick) 转义陷阱
`web/src/lib/prompts/defaultTemplates.ts` 是整个系统提示词的 Source of Truth。
- 整个模板是被包裹在 JavaScript 模板字符串 (Template Literals) `` `...` `` 里面的。
- **灾难后果**：如果在写提示词时，你需要让 AI 原样输出反引号包裹的内容（例如要求 AI 输出 `` `{@xxx}` ``），你**必须**使用转义符 `\`。如果你在替换文件时不小心丢失了转义符（写成了 `` `{@xxx}` ``），会导致整个 TS 文件的 AST 解析崩溃，出现 `Expected ',', got '{'` 这样的编译错误，进而导致整个 Next.js 生产构建瘫痪！
- **正确做法**：对模板里的反引号万分小心，修改后务必运行 `npm run build` 测试编译。

#### 3. TypeScript 联合类型严格度陷阱
系统为了防止拼写错误，在 `useProjectState.ts` 和 `ProjectContext.tsx` 中使用了极度严格的字面量联合类型。
- 例如 `processingScene` 被限制为 `'action' | 'image' | 'video' | 'voice' | null`。
- **错误示范**：当你在业务中新增了一种生成任务（比如 `startImage` 首帧生成），你在 UI 组件里兴冲冲地写了 `processingScene[i] === 'startImage'`。
- **灾难后果**：开发环境 `npm run dev` 不会立刻报错（仅会有编辑器波浪线），但这会在最终生产环境构建 (`npm run build`) 的严格类型检查阶段引发致命的 `Type error: no overlap` 错误，导致发版失败！
- **正确做法**：在新增任何功能时，先通过全局搜索（`grep_search`）去同步更新底层 Context 和自定义 Hook 中的对应 `Record` 联合类型定义。

#### 4. 场景与资产通信命名陷阱 (The Asset Naming Trap)
这个项目是一个前后端与端外（Chrome Extension）深度耦合的流水线。UI 里的文本框提示词，同时也是系统层面的“通信寻址协议”。
- **错误示范**：为了让 AI 提示词显得更“生动智能”，在 `location_prompt` 模板里指示 AI 发明自定义场景标签（如 `{@高档写字楼办公室}`），然后在 `useStoryboard.ts` 中写一段自作聪明的正则提取逻辑，把它作为锚点发给下游的视频大模型。
- **灾难后果**：发给大模型的提示词确实变成了 `在 {@高档写字楼办公室} 中`，但在 Chrome 扩展的生图底层逻辑中，全剧的通用背景必定被**硬编码**为 `场景`，独立幕背景必定为 `场景_S[x]`！当大模型生成的提示词传回 Flow 端时，自动化脚本根本找不到名为 `高档写字楼办公室` 的资产图，瞬间抛出 404 资产找不到的致命报错！
- **正确做法**：**绝对禁止**对任何跨端流转的占位符（如 `{@场景}`）做“动态化、智能化”的正则表达式提取或重命名。必须死死遵守底层的硬编码规则。写死就是最好的系统健壮性保证！

#### 5. React 状态与数据库持久化脱节陷阱 (The State Persistence Trap)
这个系统的前端由几十个庞大的 `Record<number, any>` 对象（如 `sceneImages`, `sceneVideoPrompts` 等）构成。在新增任何 UI 功能时，极容易犯下“只管前端内存，不管后端落盘”的低级错误。
- **错误示范**：你在 Chrome 扩展轮询回调中高兴地调用了 `setSceneImageRefs` 记下了文件的防伪名，然后在下一步生成视频时直接去读内存，并且以为大功告成。
- **灾难后果**：这只是把数据存到了内存！只要用户中途离开、刷新页面或者重启软件重开项目，这些内存状态会瞬间灰飞烟灭！由于没有保存在底层的 SQLite 数据库中，后续的所有生成流转都会因为读不到内存而发生各种离奇的降级 Fallback 甚至 404 崩溃！
- **正确做法**：当你向 `useProjectState.ts` 增加任何需要跨越刷新留存的业务字段时，**必须且只能**严格遵循这三步：
  1. 在 `prisma/schema.prisma` 的对应模型（如 `Scene`）中显式增加字段；
  2. 务必带上真实工作空间路径执行 `DATABASE_URL="file:/绝对路径/viral-shorts.db" npx prisma db push` 和 `npx prisma generate`；
  3. **最容易漏的一步**：在 `src/lib/db.ts` 的 `loadState` 和 `saveState`（特别是 `upsert` 的 `create` 和 `update` 块）中，**亲手**将新字段映射绑定进去！绝对不要相信只活在内存里的状态！

### 十六、 桌面客户端架构与打包避坑 (Desktop Architecture & Packaging) [v8.0]

项目从纯 Web 服务全面迁移到了 `Electron` 桌面客户端架构，实现了真正的一键分发。但这也引入了两个极其致命的底层问题：

#### 1. Node Native ABI 跨平台穿透陷阱 (C++ 编译失配)
Next.js (作为 UI/API 层) 与 Electron (作为宿主) 使用的是不同底层 Node.js 版本的 C++ 动态链接库。因为我们使用了 Prisma + SQLite，底层依赖 `better-sqlite3`。
- **灾难后果**：如果直接通过 `electron-builder` 打包 Next.js 的 `.next/standalone` 目录，生成的应用程序在启动时会瞬间崩溃，控制台报 `Module did not self-register` 或 `The module was compiled against a different Node.js version using NODE_MODULE_VERSION xxx`（比如 115 vs 135 错误）。
- **Windows 下的终极深坑 (The Hashed Directory Trap)**：最初我们在 `desktop/afterPack.js` 钩子中，写死了替换 `server/node_modules/better-sqlite3` 目录里的文件。这在 macOS 上完美运行，因为 Mac 系统支持软链接（Symlink），替换源文件就能直接生效。但在 Windows（NTFS 文件系统）下，Next.js 为了规避软链接问题，会**在底层偷偷硬复制一份名为 `better-sqlite3-xxxx`（带有一串乱码哈希值）的实体文件夹**！结果死板的替换脚本完美漏掉了这个隐藏的真实生效文件，导致在 Windows 上 Electron（Node 22）直接撞上了旧版的 Node 20 底层文件，瞬间抛出 `invalid invocation` 的连环爆炸。
- **最终解决方案 (Recursive Deep Patching)**：我们彻底重写了 `desktop/afterPack.js` 生命周期钩子，不再硬编码路径，而是**全盘递归搜索**整个 `server/` 文件夹下所有名字以 `better-sqlite3` 开头的目录。无论 Next.js 给它加上多变态的哈希后缀，脚本都会像追踪导弹一样把它揪出来，强制替换为 Electron 刚刚编译好的原生 `.node` 文件。这是彻底解决跨平台（特别是 Windows）数据库崩溃的终极解法！

#### 2. macOS LaunchServices 死锁陷阱 (错误码 -600 procNotFound)
由于我们在 Electron 中脱机运行了 `ai-gateway` 进程和 Next.js 进程，这导致了非常严重的僵尸进程隐患。
- **灾难后果**：如果在开发过程中强杀应用（比如在终端 `Ctrl+C` 或者在活动监视器强制结束），其底层衍生的 Node 孤儿服务依然驻留在后台运行。此时，如果你将一个新的安装包（`.app`）覆盖安装到 `/Applications` 文件夹，macOS 底层的 LaunchServices 缓存系统会陷入精神错乱。它会永久将该应用程序拉黑，每当你双击时都会弹窗：“应用程序已不能再打开 (The application can no longer be opened)”，并且终端返回 `-600 procNotFound` 错误。
- **正确做法与应急预案**：
  - 代码层面：我们在 `main.js` 中的 `app.on('before-quit')` 钩子中写死了进程清理逻辑，保证任何正常退出都能杀死后台衍生树。
  - 用户自救指南：如果已经陷入了被拉黑的死锁状态，只需将 `/Applications/` 中的应用程序重命名（例如改为 `Viral Shorts Studio.app`），即可瞬间绕过损坏的缓存重新启动！千万不要让用户去重装电脑！
