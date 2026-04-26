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

### 2.1 Chrome 扩展端到端提取流程 (End-to-End Extension Workflow)
这是整个生图流程的灵魂所在。为了让新模块（如 Freedom Studio）复用这套极其安全的流程，必须深刻理解以下 4 个步骤：

1. **设定活跃上下文 (Set Active Context)**
   在触发 `fireAndForget` 前，前端必须设置系统的全局 `active-context`（保存在 SQLite `systemStates` 表）。
   ```json
   {
     "projectId": "你的项目ID或标识", 
     "targetType": "characterImage", // 极其关键，必须是合法的 TargetType
     "index": 0,
     "meta": { "charName": "小雪", "fsAssetId": "xxx" }
   }
   ```
2. **扩展读取与防伪名复制 (Extension Fetch & Copy)**
   当用户在 Google Flow 中鼠标悬浮图片并点击扩展提供的「提取落盘」按钮时，扩展 (`content.js`) 会向后端请求 `/api/extension/active-context`。
   扩展内部会根据 `targetType` 组装防伪名（例如 `characterImage` 强制使用 `meta.charName`），并自动复制到系统剪贴板。
3. **推送落盘 (Push Asset to Local)**
   扩展抓取图片的 Base64 或原始 URL 后，发送到 `POST /api/extension/push-asset`。
   该接口会将文件保存到本地磁盘 `projects/[projectId]/assets/...`，同时在 SQLite 的 `inboxMessages` 表中插入一条消息。
4. **前端轮询与界面更新 (Inbox Poller)**
   系统前端会挂载一个轮询器（如 `useInboxPoller`）。它不断拉取 `inboxMessages`，如果发现有属于当前操作的素材（通过比对 targetType 和 meta），就会消费掉这条消息，更新对应的 React 状态和 Drizzle 数据库，最后在 UI 上完成回显。

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
当你在 Google Flow 内部署素材并给它命名（如 `场景_S4`）时，Flow 的搜索机制**不只是精确匹配标题，还会模糊匹配所有包含该字符的历史资产**。
- **问题场景**：如果你用 `场景_S4` 生成了第一版的图片，当你不满意想要生成第二版，并在名字中包含了同样的关键词（如 `测试2_S4_Img`）。当你下次在 Flow 中自动化 `@场景_S4` 时，Flow 会把这张新的废稿也搜索出来！由于 Flow 默认按时间倒序排序，这会导致废稿排在真正的 `场景_S4` 前面！
- **致命后果**：早期版本的自动填词器在执行搜索并按下回车时，会错误地无脑选中第一项，导致生图完全崩坏。
- **系统级解决方案 (v6.4+)**：
  我们在 `flow-automator.ts` 中彻底重构了选词逻辑，抛弃了“光速按回车盲选”的粗暴做法。
  1. **给足渲染窗口期**：在键入搜索词后，强制等待 `800ms`，让 React 等现代框架把搜索结果完整渲染到 DOM 树中。
  2. **Playwright 精确文本雷达**：不按回车，而是使用 `page.getByText(finalSearchTerm, { exact: true }).last().click()`。这让机器人在杂乱无章的搜索结果下拉单中，无视排序，直接**精确狙击**文本一字不差的那个选项并点击。
  3. **兜底回落 (Fallback)**：只有在极少数无法精准抓取 DOM 的极端情况下，才会回落到按下 `Enter` 键盲选。
