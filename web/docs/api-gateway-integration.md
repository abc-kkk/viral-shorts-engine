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

**❌ 错误做法：Fire & Forget 模式 + 人工落盘**
- Fire & Forget 模式会导致状态不同步。
- 依赖 Chrome 扩展落盘增加人工干预和维护成本。

**✅ 正确做法：Direct Connect 同步 API 直连落盘**
系统工作流已升级：前端调用统一封装的 `generateFlow`，后端 (`/api/generate-assets`) 采用 **Puppeteer 抓 Token + 纯 HTTP Fetch API** 的混合架构向 Google 提交任务。全程无缝落盘，瞬间在前端回显。

### 请求示例
在前端发起媒体生成请求时，应当调用 Next.js 的路由（如 `/api/generate-assets`），该路由会将请求转发给 `AI Gateway` 的 `/api/media/generate`：

```typescript
import { generateFlow } from '@/lib/studio/generateFlow';

// 任何前端组件内，只需要一行调用
const result = await generateFlow({ 
  kind: 'asset', 
  asset: myCharacter, 
  scriptTitle: '项目名' 
});

if (result.success && result.url) {
  // result.url 已经是本地落盘的可用文件路径
  updateThumbnail(result.url);
}
```



---

## 3. {@资产引用} 与纯 API 注入原理

以往使用 Playwright 模拟点击时，我们经常遇到输入法被拦截（需要用 `insertText`）、搜索框下拉菜单乱序等问题。
**在当前的纯 API 架构下，这些痛点已经被彻底消灭！**

当提示词中包含 `{@阿柴}` 或预设引用时，后端的解析流程如下：

### 3.1 提取与命中本地资源
在传递给 `/api/generate-assets` 时，后端会通过正则拦截所有 `{@xxx}` 并在数据库或文件系统中查找对应的 `xxx.png`。

### 3.2 高效的文件复用与媒体 ID 转换
后端会在本地读取该参考图片，并通过 `flowUploadImage` API 将其直接以 Base64 流上传到 Google Cloud，换取到一个全局的 `mediaId`。
为了极致性能，这一步增加了 **文件修改时间 (mtimeMs) 缓存**：同一个文件只需上传一次，后续生成将秒级复用 `mediaId`。

### 3.3 无痛的多模态组装
最终调用 `flowGenerateImages` 或 `flowSubmitVideoTask` 时，不再需要像人一样敲打 `@` 符号，而是直接把拿到的 `mediaId` 放在请求体的 `imageInputs` 数组中发送即可！
这彻底解决了过去自动填词器容易选中废稿、导致严重生成车祸的历史难题。
