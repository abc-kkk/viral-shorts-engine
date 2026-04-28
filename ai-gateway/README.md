# 🤖 AI Gateway — 本地私有 AI 能力网关

> 通过 Playwright CDP 劫持浏览器，将 Google Gemini / Flow / AI Studio 的免费 AI 能力封装为标准 REST API。
> 你的个人免费 AI 中台，任何项目都可以直接 HTTP 调用。

## 🌟 核心能力

| 端点 | 能力 | 底层模型 |
|---|---|---|
| `POST /api/text/generate` | 文本生成（编剧、翻译、分析） | Gemini (gemini.google.com) / 豆包 (doubao.com) |
| `POST /api/speech/generate` | 语音合成 (TTS) | Gemini TTS (AI Studio) |

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env，填入你的 Chrome CDP 地址和 Flow 项目 URL
```

### 3. 启动 Chrome（带远程调试）
```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```
然后在 Chrome 中打开 `gemini.google.com`、`doubao.com/chat`、`labs.google/fx/tools/flow` 和 `aistudio.google.com`。

### 4. 启动网关
```bash
npm run dev
```

服务将运行在 `http://localhost:4100`，访问 `/health` 检查状态。

## 📡 API 使用示例

### 文本生成
```bash
curl -X POST http://localhost:4100/api/text/generate \
  -H "Content-Type: application/json" \
  -d '{"provider": "doubao", "systemPrompt": "You are a screenwriter.", "userPrompt": "Write a short skit about a cat.", "forceJson": false}'
```

> [!TIP]
> `provider` 字段可选 `gemini` 或 `doubao`，如果不传则默认使用 `gemini`。


### 语音合成
```bash
curl -X POST http://localhost:4100/api/speech/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, world!", "voiceName": "Zephyr"}'
```

## 🔒 安全说明
- 本服务设计为**仅在本地运行**，不要暴露到公网
- 可通过设置 `API_SECRET` 环境变量启用简单的 Bearer Token 鉴权
