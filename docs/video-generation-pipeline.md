# 视频生成管线技术文档 (Video Generation Pipeline)

> 最后更新：2026-04-28 11:20 (GMT+8)

---

## 一、架构概览

视频生成管线直接调用 Google Flow REST API（aisandbox-pa.googleapis.com），绕过中间代理层，
通过 CDP 连接本地 Chrome 实例获取认证凭据后发起请求。

```
┌──────────────┐    CDP Auth     ┌──────────────┐     REST API      ┌──────────────────────┐
│  前端 UI     │ ──────────────► │  后端 Route   │ ────────────────► │  Google Flow API     │
│ (Storyboard) │                 │ generate-     │                   │  aisandbox-pa.       │
│              │ ◄────────────── │ assets/route  │ ◄──────────────── │  googleapis.com/v1   │
│  即时更新    │   result.url    │              │   operationName    └──────────────────────┘
└──────────────┘                 └──────────────┘
```

**核心文件**：
| 文件 | 职责 |
|------|------|
| `web/src/lib/utils/flowApi.ts` | Flow REST API 底层封装（图片/视频/认证/credits） |
| `web/src/app/api/generate-assets/route.ts` | 后端路由：统一入口 |
| `web/src/lib/studio/generateFlow.ts` | 前端统一调用入口 |

---

## 二、支持的视频模型矩阵

系统支持 5 种 Veo 3.1 视频模型，在**系统设置**中切换，状态存储在 SQLite `systemStates` 表的 `videoModel` 字段中。

| 模型 Key (DB 存储) | 性能层级 | 说明 |
|---|---|---|
| `veo_3_1_t2v_lite` | Lite | 快速草稿，低消耗，支持 V2 配置 |
| `veo_3_1_t2v_fast` | Fast | 快速高质量，Ultra 用户自动升级为 `_ultra` 变体 |
| `veo_3_1_t2v` | Quality | 标准质量 |
| `veo_3_1_t2v_portrait` | Portrait | 竖屏人物优化 |
| `veo_3_1_t2v_quality` | Quality+ | 最高质量 |

---

## 三、模型 Key 动态派生规则

### 3.1 文生视频 (T2V)

直接使用 DB 中存储的 `modelKey`，无需转换。

### 3.2 图生视频 (I2V) — 有首帧

根据基础 `t2v` key，自动派生对应的 `i2v` key：

```
T2V Key              →  I2V Key (首尾帧)            →  I2V Key (仅首帧)
─────────────────────────────────────────────────────────────────────────
veo_3_1_t2v_lite     →  veo_3_1_i2v_lite             →  veo_3_1_i2v_lite
veo_3_1_t2v_fast     →  veo_3_1_i2v_s_fast_fl        →  veo_3_1_i2v_s_fast  (去掉 _fl)
veo_3_1_t2v          →  veo_3_1_i2v_s                →  veo_3_1_i2v_s
veo_3_1_t2v_portrait →  veo_3_1_i2v_s_portrait       →  veo_3_1_i2v_s_portrait
```

### 3.3 首尾帧插值 (Interpolation)

仅 Lite 模型支持插值：
```
veo_3_1_t2v_lite  →  veo_3_1_interpolation_lite
```

### 3.4 `_fl` 后缀规则

- `_fl` 表示 "first + last frame" 模式
- **仅首帧（无尾帧）** 时，必须去掉 `_fl` 后缀，否则后端会 403
- 示例：`veo_3_1_i2v_s_fast_fl` → `veo_3_1_i2v_s_fast`

---

## 四、用户 Tier 动态检测 & 模型自动升级

### 4.1 动态获取 Tier

**不再硬编码用户 tier**，而是通过 `GET /credits` API 动态获取：

```typescript
// flowApi.ts — flowGetCredits()
const res = await fetch(`${API_BASE}/credits`, {
  headers: { 'Authorization': `Bearer ${at}` }
});
const { userPaygateTier, credits } = await res.json();
// 返回值示例: { userPaygateTier: "PAYGATE_TIER_TWO", credits: 920 }
```

**缓存策略**：10 分钟内存级缓存，避免每次视频生成都调一次 credits API。

### 4.2 Tier 类型

| Tier 值 | 用户类型 | 模型升级 |
|---|---|---|
| `PAYGATE_TIER_NOT_PAID` | 免费用户 | 无升级 |
| `PAYGATE_TIER_ONE` | Pro 用户 | 无升级 |
| `PAYGATE_TIER_TWO` | Ultra 用户 | 自动升级到 `_ultra` 变体 |

### 4.3 Ultra 自动升级规则

Ultra 用户（`PAYGATE_TIER_TWO`）的非 Lite 模型会自动升级为 `_ultra` 变体：

```
原始 Key                      →  升级后 Key
──────────────────────────────────────────────────
veo_3_1_i2v_s_fast            →  veo_3_1_i2v_s_fast_ultra
veo_3_1_i2v_s_fast_fl         →  veo_3_1_i2v_s_fast_ultra_fl  (_fl 前插入 _ultra)
veo_3_1_i2v_s                 →  veo_3_1_i2v_s_ultra
veo_3_1_t2v                   →  veo_3_1_t2v_ultra
```

**Lite 模型不升级**（`allow_tier_upgrade = false`），始终原样传递。

---

## 五、请求体构建规则 (对齐 flow2api)

### 5.1 Lite 模型 vs 非 Lite 模型

| 字段 | Lite 模型 | 非 Lite 模型 |
|------|-----------|-------------|
| `useV2ModelConfig` | `true` | **不传** |
| `mediaGenerationContext` | `{ batchId: UUID }` | **不传** |
| `textInput` 格式 | `{ structuredPrompt: { parts: [{ text }] } }` | `{ prompt: text }` |

> ⚠️ 非 Lite 模型如果传了 `useV2ModelConfig: true`，后端会 **403 拒绝**！

### 5.2 完整请求体示例 (非 Lite, Fast, Ultra, 仅首帧)

```json
{
  "clientContext": {
    "recaptchaContext": {
      "token": "03AKH6MR...",
      "applicationType": "RECAPTCHA_APPLICATION_TYPE_WEB"
    },
    "sessionId": ";1745814000000",
    "projectId": "abc123",
    "tool": "PINHOLE",
    "userPaygateTier": "PAYGATE_TIER_TWO"
  },
  "requests": [{
    "aspectRatio": "VIDEO_ASPECT_RATIO_16_9",
    "seed": 123456,
    "metadata": { "sceneId": "scene-1745814000000" },
    "videoModelKey": "veo_3_1_i2v_s_fast_ultra",
    "startImage": { "mediaId": "media-id-xxx" },
    "textInput": { "prompt": "角色走过竹林小道..." }
  }]
}
```

### 5.3 API Endpoints

| 场景 | Endpoint |
|------|----------|
| 文生视频 (T2V) | `video:batchAsyncGenerateVideoText` |
| 仅首帧 (I2V) | `video:batchAsyncGenerateVideoStartImage` |
| 首尾帧 (I2V+FL) | `video:batchAsyncGenerateVideoStartAndEndImage` |

---

## 六、首尾帧参考图上传

视频生成的首尾帧参考图通过 `flowUploadImage()` 上传到 Google Cloud 获取 `mediaId`：

```typescript
// 上传流程
const imageUrl = shot.firstFrameImage; // CDN URL
const imageBytes = await fetch(imageUrl).then(r => r.buffer());
const mediaId = await flowUploadImage(projectId, at, imageBytes);
// mediaId 用于 startImage / endImage
```

**内存级缓存（`mediaIdCache`）**：基于文件 `mtime` 去重，同一张图不会重复上传。

---

## 七、分镜提示词生成管线

### 7.1 资产上下文注入

分镜提示词生成 (`POST /api/studio/scripts/[id]/generate-shot-prompts`) 会注入三类资产上下文：

| 资产类型 | 来源 | 注入到 AI 的上下文段 |
|---|---|---|
| 角色 (`character`) | `shotCharacters` (用户可增删) | `【涉及角色及外貌】` |
| 场景 (`scene`) | `sceneName` (绑定到镜头组) | `【指定场景名称】+【场景细节信息】` |
| 道具 (`prop`) | `shotProps` (用户可增删) | `【涉及道具】` |

### 7.2 `{@引用}` 语法规则

AI 生成的首帧/尾帧提示词中会使用 `{@xxx}` 语法引用资产图片：

- `{@角色名}` — 引用角色参考图
- `{@场景名}` — 引用场景参考图
- `{@道具名}` — 引用道具参考图
- `videoPrompt` 中**禁止**使用 `{@}` 标签（视频引擎不支持）

### 7.3 提示词生成七大核心原则

1. **视觉关键词密集** — 每个提示词 3-5 个具象化视觉细节
2. **情绪/氛围色彩主导** — 明确色调情绪关键词
3. **运镜指令化** — 专业电影术语（景别 + 构图 + 运动）
4. **动作分解与关键帧强调** — 复杂动作拆解为关键姿态
5. **角色视觉区分** — 携带核心外貌特征，防止 AI 混淆
6. **安全合规转化** — 冲突动作转化为温和描述
7. **听觉元素辅助** — 仅 videoPrompt，备注音效提示

---

## 八、已知陷阱与排错指南

### 🔴 403 Forbidden

| 原因 | 解决方案 |
|------|---------|
| 非 Lite 模型传了 `useV2ModelConfig: true` | 确保只有 Lite 模型才加此字段 |
| `userPaygateTier` 与实际账户不匹配 | 使用 `flowGetCredits()` 动态获取 |
| 仅首帧模式但 modelKey 带 `_fl` 后缀 | 自动去掉 `_fl` 后缀 |
| 免费用户调用 Fast/Quality 模型 | 检查 credits/tier 是否正确 |

### 🔴 模型 Key 映射失败

检查 `flowSubmitVideoTask` 中的字符串替换链条：
```
t2v → i2v_s → 去 _fl → 加 _ultra → 最终 key
```
每一步的替换顺序不可调换。

### 🔴 参考图上传失败

- 确保 CDP 连接正常（Chrome `--remote-debugging-port` 已开启）
- `mediaIdCache` 缓存可能过期，重启应用可清除

---

## 九、配置项

| 配置 | 位置 | 说明 |
|------|------|------|
| `videoModel` | SQLite `systemStates` 表 | 当前选中的视频模型 key |
| `AI_GATEWAY_URL` | `.env.local` | AI 文本生成网关地址 |
| `WORKSPACE_PATH` | `.env.local` | 项目资产存储根路径 |
| Chrome CDP Port | 启动参数 | 默认 9222 |
