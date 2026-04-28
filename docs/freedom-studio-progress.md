# Freedom Studio 开发进度

> 最后更新：2026-04-28 11:20 (GMT+8)

---

## 一、已完成功能

### 1. AI 资产提取（并行化）
- **分类独立提取**：角色、场景、道具各自独立提取按钮，互不干扰
- **角色描述净化**：AI 提取时过滤情绪化表情词（如"眉头紧锁"），只保留中性外貌特征
- **场景唯一命名**：强制 AI 返回具体场景名（如"苏氏集团总裁办公室"），杜绝泛化的"场景"命名
- 文件：`web/src/app/api/studio/scripts/[id]/analyze/route.ts`

### 2. REST API 直连生图（新架构 ✅）
- **完全绕过 Chrome 扩展**：后端通过 CDP 协议直连 Chrome 实例获取 SessionToken + reCAPTCHA，然后直接调用 Google Flow REST API
- **同步返回 URL**：每次生图请求同步返回 CDN URL，前端立即更新缩略图，不再依赖 SSE/轮询
- **内存级媒体缓存**：`mediaIdCache` 基于文件 `mtime` 对参考图去重上传，消除跨请求的冗余上传
- **批量生成**：`/api/generate-assets/batch` 支持一次请求最多 4 张图，前端自动分批调用
- 文件：`web/src/app/api/generate-assets/route.ts`、`web/src/lib/utils/flowApi.ts`

### 3. 防伪命名系统
- **文件名生成**：`generateAssetFilename()` 统一使用 `meta.charName` 作为文件名
- **多维度命名**：角度图自动加 `_angleKey` 后缀（如 `苏家别墅正厅_左45°.png`），避免覆盖
- **画幅区分**：道具=1:1 正方形、场景/角色=16:9 横屏，`aspectRatio` 全链路透传
- 文件：`web/src/lib/assetUrl.ts`

### 4. 道具生图支持
- **UI**：AssetCard 的 ✨ 生成按钮已解除类型限制，角色/场景/道具均可生图
- **Prompt**：道具专用英文 Prompt，产品摄影级别（macro lens, studio strobe, 8K）
- **画幅**：道具自动使用 `IMAGE_ASPECT_RATIO_SQUARE`（1:1）
- **Pipeline**：道具的 `targetType` 统一为 `locationImage`，复用场景的落盘通道
- 文件：`web/src/lib/studio/store/useStudioStore.ts`、`web/src/lib/studio/generateFlow.ts`

### 5. 场景多角度面板
- **交互**：点击场景卡片图片 → 打开全屏多角度面板（左侧大图预览 + 右侧 8 角度网格）
- **8 个预设机位**：正面、左45°、右45°、左侧、右侧、下俯视、俯瞰45°、俯瞰90°
- **一键生成全部角度**：前端自动分批（每批≤4），完成一批立刻上屏
- **数据存储**：`FsSceneData.angles: Record<string, string>` 存储角度图 URL
- **命名策略**：`{场景名}_{角度}.png`（如 `苏家别墅正厅_左45°.png`）
- 文件：`web/src/components/studio/assets/SceneAngleModal.tsx`

### 6. 分镜创作室
- **分镜提取**：从剧本 AI 提取分组 + 镜头 + 首尾帧/视频提示词
- **帧生成**：直接调用 REST API 同步返回，立即更新预览图
- **视频生成**：直接使用最新的 `firstFrameImage` / `lastFrameImage` URL 作为首尾帧参考
- **结果即时保存**：图片/视频生成后立即调用 `updateStoryboardShot()` 写入 DB
- **道具资产注入**：每个镜头支持手动绑定道具资产，生成提示词时自动注入道具上下文并使用 `{@道具名}` 引用语法
- 文件：`web/src/app/studio/scripts/[id]/storyboard/page.tsx`

### 7. 视频生成管线（对齐 flow2api）
- **5 种 Veo 模型支持**：Lite / Fast / Quality / Portrait / Quality+，在系统设置中切换
- **动态 Model Key 派生**：根据基础 T2V key 自动派生 I2V / Interpolation key
- **`_fl` 后缀智能处理**：仅首帧模式自动去掉 `_fl`，首尾帧模式保留
- **用户 Tier 动态检测**：通过 `GET /credits` API 获取真实 `userPaygateTier`（10 分钟内存缓存）
- **Ultra 模型自动升级**：TIER_TWO 用户的非 Lite 模型自动加 `_ultra` 后缀
- **V2 配置条件注入**：仅 Lite 模型加 `useV2ModelConfig` + `mediaGenerationContext`，非 Lite 模型禁止传入（否则 403）
- **Prompt 格式适配**：Lite 用 `structuredPrompt`，非 Lite 用 `{ prompt }`
- 📖 详见：`docs/video-generation-pipeline.md`
- 文件：`web/src/lib/utils/flowApi.ts`

---

## 二、关键架构规则

### 🔴 必须使用 `generateFlow()` 统一入口
**所有 Freedom Studio 的生图请求**必须通过 `generateFlow()` 发起，禁止直接调用 `/api/generate-assets`。

```typescript
import { generateFlow, extractRefKeywords } from '@/lib/studio/generateFlow';

// 资产主图
const res = await generateFlow({ kind: 'asset', asset, scriptTitle: '古装仙侠' });
if (res.url) updateAsset(asset.id, { thumbnail: res.url }); // ✅ 立即用 URL

// 分镜帧
const res = await generateFlow({ kind: 'storyboardFrame', ... });
if (res.url) updateStoryboardShot(shotId, { firstFrameImage: res.url }); // ✅ 立即保存
```

### 🔴 生成结果必须立即使用 `result.url`
```typescript
// ❌ 旧模式：等 SSE 推送（已废弃）
setTimeout(() => clearLoading(), 5000);

// ✅ 新模式：同步返回，立即更新
if (result.url) updateAsset(id, { thumbnail: result.url });
```

### 🔴 视频/图片引用必须用最新 URL
```typescript
// ❌ 旧模式：用 Chrome 插件注册的旧引用名
const startRef = sceneImageRefs[i]; // 过期！

// ✅ 新模式：用 Store 中最新的图片 URL
const startUrl = sceneStartImages[i]; // 永远最新
```

### 🔴 批量请求每批最多 4 个 prompt
Google Flow API 限制每次 ≤4 个 prompt。分批在**前端**做，后端保持简单的单批处理。

---

## 三、已知待优化项

### UI/UX
- [ ] 场景卡片右下角「📐 N 角度」角标已实现，需验证显示是否正确
- [ ] 批量生成时增加"选择性批量生成"或"单张失败重试"

### 架构
- [ ] `updateAsset()` 内部调用 `selectScript()` 过于重量级，应提供轻量版 `patchAsset()` 方法
- [ ] 生产环境增加 `/tmp` 临时图片清理脚本
- [ ] 监控 Google API 流控（Rate Limiting），必要时调整并发策略

---

## 四、关键文件索引

| 文件 | 职责 |
|------|------|
| `web/src/lib/assetUrl.ts` | 资产文件名生成（防伪命名核心） |
| `web/src/lib/studio/types.ts` | FsAsset / FsSceneData / FsPropData 类型定义 |
| `web/src/lib/studio/generateFlow.ts` | 统一生图入口（封装 REST API 调用） |
| `web/src/lib/studio/store/useStudioStore.ts` | Zustand Store：生图、资产 CRUD |
| `web/src/lib/utils/flowApi.ts` | Google Flow REST API 底层封装（图片/视频/credits/认证） |
| `web/src/app/api/generate-assets/route.ts` | 单张生图后端路由 |
| `web/src/app/api/generate-assets/batch/route.ts` | 批量生图后端路由 |
| `web/src/components/studio/assets/AssetCard.tsx` | 资产卡片 UI（含场景多角度入口） |
| `web/src/components/studio/assets/SceneAngleModal.tsx` | 场景多角度面板（8 机位 + 一键生成） |
| `web/src/app/studio/scripts/[id]/storyboard/page.tsx` | 分镜创作室页面（含角色/道具/场景绑定） |
| `web/src/app/api/studio/scripts/[id]/generate-shot-prompts/route.ts` | 分镜提示词生成 API（注入角色/场景/道具上下文） |
| `web/src/lib/context/useStoryboard.ts` | 分镜生成逻辑（旧项目系统） |
| `web/src/lib/context/useCastingRoom.ts` | 角色/场景生图逻辑（旧项目系统） |
| `web/src/app/api/studio/scripts/[id]/analyze/route.ts` | AI 资产提取（分类并行） |
| `docs/video-generation-pipeline.md` | 视频生成管线技术文档 |
