# 桌面客户端架构与打包避坑 (Desktop Architecture & Packaging) [v8.0]

项目从纯 Web 服务全面迁移到了 `Electron` 桌面客户端架构，实现了真正的一键分发。但这也引入了两个极其致命的底层问题：

## 1. Node Native ABI 跨平台穿透陷阱 (C++ 编译失配)
虽然我们在 v8.2 移除了令人抓狂的 Prisma 引擎，但由于依然依赖原生的高性能 `better-sqlite3`，Next.js 与 Electron 之间的 Node.js 版本 C++ 动态链接库依然存在鸿沟。

- **灾难后果**：如果直接打包 `.next/standalone`，应用启动时会报 `The module was compiled against a different Node.js version using NODE_MODULE_VERSION xxx`。
- **Windows 下的终极深坑 (The Hashed Directory Trap)**：最初我们在 `desktop/afterPack.js` 中写死了替换 `node_modules/better-sqlite3`，这在 Mac 下因为软链接完美运行。但在 Windows（NTFS）下，Next.js 会偷偷硬复制一份名为 `better-sqlite3-xxxx`（带随机哈希）的实体文件夹！结果死板的替换脚本漏掉了生效文件，导致启动时撞上旧版文件触发 `invalid invocation` 连环爆炸。
- **最终解决方案 (Recursive Deep Patching)**：在 `desktop/afterPack.js` 中我们全盘递归搜索整个 `server/` 下所有名为 `better-sqlite3` 开头的目录，强制替换为 Electron 刚编译好的 `.node` 文件。这一暴力美学彻底解决了 Windows 数据库崩溃。

## 2. macOS LaunchServices 死锁陷阱 (错误码 -600 procNotFound)
由于我们在 Electron 中脱机运行了 `ai-gateway` 进程和 Next.js 进程，这导致了非常严重的僵尸进程隐患。

- **灾难后果**：如果在开发过程中强杀应用（比如在终端 `Ctrl+C` 或者在活动监视器强制结束），其底层衍生的 Node 孤儿服务依然驻留在后台运行。此时，如果你将一个新的安装包（`.app`）覆盖安装到 `/Applications` 文件夹，macOS 底层的 LaunchServices 缓存系统会陷入精神错乱。它会永久将该应用程序拉黑，每当你双击时都会弹窗：“应用程序已不能再打开 (The application can no longer be opened)”，并且终端返回 `-600 procNotFound` 错误。
- **正确做法与应急预案**：
  - 代码层面：我们在 `main.js` 中的 `app.on('before-quit')` 钩子中写死了进程清理逻辑，保证任何正常退出都能杀死后台衍生树。
  - 用户自救指南：如果已经陷入了被拉黑的死锁状态，只需将 `/Applications/` 中的应用程序重命名（例如改为 `Viral Shorts Studio.app`），即可瞬间绕过损坏的缓存重新启动！千万不要让用户去重装电脑！
