# Freedom Studio（自由创作室）— 开发进度与待完成清单

> 最后更新：2026-04-26

---

## 一、模块概述

Freedom Studio 是 Viral Shorts Engine 的全新创作模块，**独立于现有 5 阶段流水线**，核心理念是「用户最大自由度，AI 是辅助工具而非主导者」。

### 设计原则

- 🎯 **剧本先行**：先有剧本，再从剧本中提取角色/场景/道具
- 🤖 **AI 辅助**：AI 帮你生成/润色剧本、提取资产，但不替代创作决策
- 🧩 **模块化**：每个功能独立页面，流程可跳转可回溯
- 🔒 **隔离性**：路由 `/studio/*`，完全不影响现有旧系统代码

### 技术栈

| 技术 | 用途 |
|------|------|
| Next.js App Router | 前端页面 + API 路由 |
| Zustand | 状态管理（useStudioStore） |
| Drizzle ORM + SQLite | 数据持久化 |
| AI Gateway | 调用 Gemini Web 生成/分析 |
| Vitest | 测试框架（内存 SQLite 集成测试） |

---

## 二、已完成功能

### ✅ Module 1：数据层 & 剧本管理

#### 数据库 Schema

| 表 | 说明 | 迁移文件 |
|---|---|---|
| `FsScript` | 剧本（标题/内容/状态/来源/类型/集数/简介/metadata） | `0004_freedom_studio_script_first.sql` |
| `FsAsset` | 统一资产表（角色/场景/道具，通过 type 区分，scriptId 外键） | `0003_talented_gideon.sql` → `0004` 重构加 scriptId |

#### API 路由

| 方法 | 路径 | 功能 |
|------|------|------|
| `GET` | `/api/studio/scripts` | 剧本列表 |
| `POST` | `/api/studio/scripts` | 创建剧本 |
| `GET` | `/api/studio/scripts/[id]` | 剧本详情（含资产） |
| `PATCH` | `/api/studio/scripts/[id]` | 更新剧本 |
| `DELETE` | `/api/studio/scripts/[id]` | 删除剧本 |
| `POST` | `/api/studio/scripts/[id]/generate` | AI 生成/润色剧本 |
| `POST` | `/api/studio/scripts/[id]/analyze` | AI 分析剧本提取资产 |
| `GET` | `/api/studio/assets` | 资产列表 |
| `POST` | `/api/studio/assets` | 创建资产 |
| `PATCH` | `/api/studio/assets/[id]` | 更新资产 |
| `DELETE` | `/api/studio/assets/[id]` | 删除资产 |

#### 前端页面

| 路由 | 页面 | 功能 |
|------|------|------|
| `/studio` | 创作室首页 | 剧本列表 + 新建按钮 |
| `/studio/scripts/[id]` | 剧本编辑页 | 纯剧本编辑 + AI 生成/润色 + 「下一步」跳转资产管理 |
| `/studio/scripts/[id]/assets` | 资产管理页 | 角色/场景/道具三标签页 + AI 提取 + 手动添加 + 编辑/删除 + **AI 生图抽卡** |

#### AI 功能 & 扩展集成

1. **AI 生成剧本**（`mode: 'generate'`）
   - 用户输入故事想法 + 可选类型/集数
   - 调用 AI Gateway `/api/text/generate` 生成完整剧本
   - 剧本 source 标记为 `ai-generated`

2. **AI 润色剧本**（`mode: 'polish'`）
   - 用户输入修改要求
   - AI 在已有内容基础上润色/改写

3. **AI 提取资产**
   - 后端自动读取剧本全文
   - 调 AI Gateway 分析提取角色/场景/道具
   - 支持 `forceJson:true` 和 markdown 包裹的 JSON 解析
   - 提取结果自动创建为 FsAsset 记录

4. **AI 资产视觉参考图生成**（**最新完成**）
   - 深度复用旧版引擎的 Chrome 扩展“提取落盘”机制，实现零侵入打通。
   - 前端点击生图（Nano Banana Pro），通过 `useStudioInboxPoller` 监听扩展的 SSE 推送。
   - 扩展完成抽卡后自动入库，前端无需刷新自动展示图片缩略图。
   - **项目隔离与独立配置**：
     - 新剧本的素材落盘物理路径强制前置 `projects/` (如：`[Workspace]/projects/都市逆袭/images/characters/小雪.png`)，与老版项目完美物理隔离。
     - Google Flow URL 独立绑定在每个剧本的 `metadata.flowUrl` 中，互不干扰。

#### 状态管理

- `useStudioStore`（Zustand）— 剧本 CRUD + 资产 CRUD + AI 生成 + AI 分析
- 状态字段：`scripts`, `currentScript`, `currentAssets`, `loading`, `analyzing`, `generating`, `error`

#### 测试

- **5 个测试文件，32/32 测试全通过**
- 覆盖：剧本 CRUD、资产 CRUD、唯一约束、字段映射完整性

---

## 三、Bug 修复记录

### 迁移未生效导致 500 错误

- **现象**：desktop 运行 `npm start` 后，创建剧本 POST 500
- **根因**：drizzle 的 0004 迁移 hash 被记录了，但 SQL 实际没执行（FsScript/FsAsset 表不存在）
- **数据库位置**：`D:/data/short/viral-shorts.db`（workspacePath 在 Electron store 配置）
- **修复**：手动执行 SQL 创建了缺失的表；API 加了 `console.error` 输出完整错误
- **教训**：测试用内存 DB 不会暴露迁移问题，需要确保生产数据库的迁移状态正确

---

## 四、待完成功能

### 🔴 高优先级（核心流程打通）

#### 1. 资产与分镜的关联 — 节点工作流
- **状态**：❌ 未开始
- **说明**：PRD 中最核心的创新，类似 ComfyUI 的可拖拽节点画布
- **技术方案**：React Flow
- **功能**：
  - 角色/场景/道具拖入画布成为节点
  - 节点间连线表达关系（角色→场景「出场」、角色→道具「使用」）
  - 从节点组合自动生成分镜
  - 可视化编辑创作流程

#### 2. 分镜生成
- **状态**：❌ 未开始
- **说明**：从剧本+资产 → AI 生成分镜提示词 → 生图/生视频
- **需要**：
  - 分镜数据模型（FsStoryboard?）
  - AI 生成提示词（基于剧本段落 + 出场角色 + 场景）
  - 对接现有 Flow 自动化生图/视频流程
  - 分镜编辑器（提示词微调、生成、预览）

#### 3. 配音
- **状态**：❌ 未开始
- **说明**：对接 Gemini TTS 或其他 TTS 引擎
- **参考**：旧系统 `aistudio-automator.ts` 已有 Gemini TTS 实现

### 🟡 中优先级（体验优化）

#### 4. 资产详情与模型增强
- **状态**：🟡 待深入
- **说明**：
  - 目前完成了生图与缩略图展示，但还需要大图预览。
  - 需要支持从本地手动上传参考图覆盖 AI 生成的图。
  - 角色数据模型可考虑扩充更多细节（用于未来的剧本连续性生成）。

#### 5. 剧本编辑器增强
- **状态**：❌ 未开始
- **说明**：
  - 富文本编辑器（TipTap）替代当前 textarea
  - 支持 TXT/DOCX 导入
  - 剧本版本历史
  - 灵感库（AI 推荐故事方向）

#### 6. AI 分析增强
- **状态**：⚠️ 基础已完成，需增强
- **说明**：
  - 当前 AI 提取角色/场景/道具只提取名称和描述
  - 需要增强：角色关系提取、角色外貌描述（为生图准备）、场景氛围描述
  - 支持增量分析（剧本更新后只提取变化部分）

### 🟢 低优先级（锦上添花）

#### 7. 角色关系图谱
- **状态**：❌ 未开始（用户明确说先不做，文字描述即可）
- **说明**：可视化展示角色间关系

#### 8. 剪映导出
- **状态**：❌ 未开始
- **说明**：旧系统已有 `jsjianyingdraft` 实现，可复用

#### 9. 提示词模板管理
- **状态**：❌ 未开始
- **说明**：旧系统已有完善的提示词模板引擎，可考虑复用/适配

---

## 五、项目文件清单

### 新增文件

```
web/src/
├── app/
│   ├── studio/
│   │   ├── layout.tsx                          # 创作室布局
│   │   ├── page.tsx                            # 首页（剧本列表）
│   │   └── scripts/[id]/
│   │       ├── page.tsx                        # 剧本编辑页
│   │       └── assets/page.tsx                 # 资产管理页
│   └── api/studio/
│       ├── scripts/
│       │   ├── route.ts                        # 剧本列表/创建
│       │   └── [id]/
│       │       ├── route.ts                    # 剧本详情/更新/删除
│       │       ├── generate/route.ts           # AI 生成/润色
│       │       └── analyze/route.ts            # AI 分析提取资产
│       └── assets/
│           ├── route.ts                        # 资产列表/创建
│           └── [id]/route.ts                   # 资产更新/删除
├── components/studio/
│   ├── StudioLayout.tsx                        # 侧边栏布局
│   └── assets/
│       ├── AssetCard.tsx                       # 资产卡片
│       └── AssetEditorDialog.tsx               # 资产编辑弹窗
└── lib/studio/
    ├── schema.ts                               # Drizzle 表定义
    ├── types.ts                                # TypeScript 类型
    ├── db.ts                                   # 数据库 CRUD
    └── store/
        └── useStudioStore.ts                   # Zustand 状态管理
```

### 修改的现有文件

| 文件 | 改动 |
|------|------|
| `drizzle.config.ts` | 加了 studio schema 入口 |
| `package.json` | 加了 test 脚本 |
| `__tests__/fieldRegistry.test.ts` | 修复已有 bug |
| `web/docs/architecture.md` | 需更新（本文档替代） |

### 迁移文件

| 文件 | 内容 |
|------|------|
| `drizzle/0003_talented_gideon.sql` | 初始 FsAsset 表 |
| `drizzle/0004_freedom_studio_script_first.sql` | FsScript 表 + FsAsset 重构加 scriptId |

---

## 六、架构设计决策记录

| 决策 | 原因 | 时间 |
|------|------|------|
| 剧本先行（先写剧本再管资产） | 用户反馈"没剧本哪来的角色" | 2026-04-26 |
| 统一资产表（FsAsset + type 字段） | MVP 阶段简化，避免三张表 | 2026-04-26 |
| 角色/场景/道具用文字描述关系 | 用户明确说先不做图谱 | 2026-04-26 |
| AI 分析放后端而非前端 | 避免前端传 mock，保证分析质量 | 2026-04-26 |
| 剧本编辑和资产管理拆成独立页面 | 用户反馈"不该放一起" | 2026-04-26 |
| AI Gateway 走 Gemini Web Automator | 项目既有方案，零成本 | 2026-04-26 |
| 资产素材落盘目录带 `projects/` 前缀 | 强制将新项目收纳至 `projects` 子目录，保持与旧项目物理隔离，不污染根目录 | 2026-04-26 |
| 独立剧本 Flow URL | 将 Flow URL 存在 FsScript 隐藏字段 metadata 里，完美规避 DB Migration 风险 | 2026-04-26 |

---

## 七、已知问题

1. **drizzle 迁移可能静默失败** — 0004 迁移的 hash 被记录但 SQL 未执行，已手动修复但根因未排查
2. **AI 分析依赖 AI Gateway 可用性** — 如果 AI Gateway 未启动，生成/润色/分析都会失败
3. **资产卡目前只有文字** — 没有参考图上传/AI生图功能
4. **剧本编辑器是 textarea** — 没有富文本，没有导入功能
5. **首页侧边栏入口硬编码** — "自由创作室 [NEW]" 文案和链接是写死的
