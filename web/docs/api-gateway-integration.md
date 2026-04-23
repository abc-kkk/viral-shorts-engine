# AI Gateway API 与开发避坑指南

本文档总结了在 `Viral Shorts Engine` 中集成 AI 文本生成（Gemini/豆包）与图片/视频生成（Flow）的最佳实践与 API 规范。为了保持系统架构一致并避免重复踩坑，请在后续开发中严格遵守以下规范。

## 1. 文本生成 API 规范 (Text Generation)

**❌ 错误做法：直接调用第三方 REST API (如 Gemini API, MiniMax API)**
- 直接调用官方 API 容易遇到 429 限流问题。
- 需要在每个前端模块中重复配置 API Key。
- 无法统一管控请求状态和队列。

**✅ 正确做法：调用本地 AI Gateway (`/api/text/generate`)**
系统内部实现了一套基于浏览器自动化的网页劫持（Web Automation）机制，来获取文本生成结果。必须统一通过 AI Gateway 转发请求。

### 请求示例
```typescript
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:4100';

const gatewayRes = await fetch(`${AI_GATEWAY_URL}/api/text/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    systemPrompt: "你是一个专业的提示词编写助手...",
    userPrompt: "请帮我描述一个阳光明媚的客厅...",
    forceJson: false,       // 根据需要是否强制返回 JSON 格式
    provider: 'gemini'      // 可选 'gemini' | 'doubao'
  }),
});

const data = await gatewayRes.json();
console.log(data.text); // AI 生成的文本结果
```

---

## 2. 媒体生图/视频 API 规范 (Media Generation)

**❌ 错误做法：后端等待生图完成并提取图片 URL**
- 自动化生成过程漫长，前端容易请求超时。
- 难以稳定从 Google Flow 网页中提取高质量的原始图片链接。

**✅ 正确做法：Fire & Forget 模式 + Chrome 扩展人工落盘**
系统设计的工作流是：后端自动化工具 (`flow-automator`) 负责**填写提示词并点击生成**。生成过程结束后，自动化脚本即可退出（Fire and Forget）。最终的选图与图片保存，统一交由配套的 Chrome 插件进行本地落盘，保证获取最高质量的素材。

### 请求示例
在前端发起媒体生成请求时，应当调用 Next.js 的路由（如 `/api/generate-assets`），该路由会将请求转发给 `AI Gateway` 的 `/api/media/generate`：

```typescript
// 前端调用 Next.js 路由
const res = await fetch('/api/generate-assets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "提示词...",
    model: "Nano Banana Pro", // 或 'Veo 3.1'
    referenceKeywords: ["布局图", "男主"], // 从提示词中提取出实际被 {@} 引用的资产标签
    flowUrl: "https://labs.google/fx/...",
    projectId: "your-project-id",
    fireAndForget: true // 核心参数：通知后端触发即走
  }),
});

const data = await res.json();
if (data.success || data.fireAndForget) {
  // 提示用户：请在 Flow 页面等待生成完成，用 Chrome 扩展选图落盘。
}
```

---

## 3. {@资产引用} 与注入排雷指南

在向 `flow-automator` 发送带有 `{@}` 语法的资产参考图提示词时，极其容易踩坑。请务必注意以下几点：

### 3.1 必须精确提取 Reference Keywords
在传递给 `api/generate-assets` 时，`referenceKeywords` 数组**绝不能硬编码**列出所有可用的素材！否则 `flow-automator` 会将所有关键词作为 `@` 前置注入。
**正确做法**：使用正则表达式，只从用户最终组成的 `prompt` 文本中提取实际使用了的引用。
```typescript
// 提取用户真实用到的引用，例如 prompt 中只有 {@布局图}
const keywordMatches = composedPrompt.matchAll(/\{@([^{}]+)\}/g);
const keywords = Array.from(keywordMatches, m => m[1]); // ["布局图"]
```

### 3.2 避免中文输入法的键盘拦截 (Playwright 避坑)
在 Node 端写 Playwright 自动化脚本时（如 `flow-automator.ts`），当需要在搜索框输入中文时：
**❌ 不要用** `page.keyboard.type('中文')`：这个方法是模拟逐个按键敲击，macOS 下会触发中文输入法（IME），导致传入的字符变成错乱的拼音。
**✅ 必须用** `page.keyboard.insertText('中文')`：直接将完整的中文字符串粘贴插入输入框，绕过 IME 拦截。

### 3.3 警惕 AI 幻觉脑补场景
当请求 AI 根据 `{@参考图}` 生成提示词时，如果提示词系统设定默认要求“角色互动”，但参考图中仅有家具，AI 会为了满足系统要求而强行捏造不存在的角色和颜色。
**解决办法**：
在构造 AI `systemPrompt` 时，提供极其精准的「所见即所得」映射关系表：
```text
布局图中【实际存在的色块】如下（没有列出的颜色就不存在，不要编造）：
  - #8B4513 色块 = 桌子（桌子）
  - #8B4513 色块 = 椅子（椅子）
```
并在 Prompt 的兜底策略上做动态判定：如果 `characters` 数组为空，要求 AI "展现场景真实的材质光影，不要人物出现"。

### 3.4 警惕 Google Flow 的“套娃式”搜索命中 (Flow Search Quirk)
当你在 Google Flow 内部署素材并给它命名（如 `布局图`）时，Flow 的搜索机制**不只是匹配标题，还会匹配素材在生成时用到的 Prompt 全文**。
- **问题场景**：如果你用 `布局图` 作为参考图生成了一张 `场景图`，这张新图的 Prompt 里会包含 `{@布局图}`。当你下次在 Flow 中搜索 `布局图` 时，Flow 会把这张新的 `场景图` 也搜索出来！由于 Flow 默认按时间倒序排序，这会导致你的 `场景图` 排在真正的 `布局图` 前面！
- **致命后果**：自动填词器在执行 `@布局图` 搜索并按下回车时，会错误地选中第一项（即 `场景图` 或其他内置推荐如 `Two figures by couch`），导致生图完全崩坏。
- **解决方案**：
  1. **放弃常用词命名**：切勿使用 `布局图`、`场景`、`男主` 这类通用词汇作为 Flow 资产名。
  2. **使用专有英文代号 (Unique Identifiers)**：统一使用高辨识度的英文 ID 作为 Flow 资产名，例如 `REF_LAYOUT`、`REF_SCENE`、`REF_CHAR_123`。
  3. **利用星标优先级**：在手动向 Flow 导入自己画的布局图时，务必点亮“红心”（收藏），这样在同名或混淆匹配时，收藏的素材会获得绝对优先展示权。
  4. **保持自动机等待延迟**：搜索框输入内容后（防抖机制），必须给 Flow 搜索结果列表 `300ms ~ 1500ms`（视网络情况而定）的响应和 DOM 刷新时间，绝对禁止光速按下回车。
