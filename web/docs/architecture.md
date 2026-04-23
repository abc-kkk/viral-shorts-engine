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
