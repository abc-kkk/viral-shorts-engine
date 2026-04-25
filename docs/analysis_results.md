# 问题排查结果：更新后项目数据不显示的原因

您好！我已经仔细排查了项目代码和最近的提交记录，找到了导致“更新最新版后项目在，但数据不显示”的具体原因。

**先说结论：项目数据并没有丢失，物理文件（视频、图片等）确实都完好无损地保存在本地目录中。数据不显示是因为新版本修改了数据库字段，但没有对已存在的老数据库文件进行升级（Migration），导致新代码查询老数据库时报错崩溃。**

---

### 🔍 详细原因分析

1. **数据库字段发生了增减 (正如您所猜测的)**：
   在最新的 `v1.0.21` 版本更新中，您修改了 `web/prisma/schema.prisma` 中的 `Scene` 表结构：
   - **删除了**：`actionLayoutPrompt` 字段
   - **新增了**：`startLayoutPrompt`、`endLayoutPrompt`、`imageRef`、`startImageRef` 字段

2. **老数据库文件没有被自动升级**：
   在 `web/src/lib/db.ts` 和 `desktop/lib/processManager.js` 的启动逻辑中，程序**仅在数据库文件不存在时**才会通过 `template.db` 创建新数据库。如果用户的 `viral-shorts.db` 已经存在（老版本创建的），程序会直接使用它，而**不会执行 `prisma db push` 或其他字段更新操作**。

3. **Prisma 查询报错导致前端拉取不到数据**：
   - 首页 `listProjects` 之所以能正常显示项目列表，是因为它只查询了 `Project` 和 `Character` 表，这两个表并没有结构变化。
   - 但是，当您点击进入项目时，前端会调用 `/api/state` 接口去拉取项目详情。
   - 后端 `loadState()` 函数使用新的 Prisma Client 查询 `Scene` 表时，试图去读取新增加的 `startLayoutPrompt` 等字段。由于老数据库里根本没有这些列，SQLite 直接抛出了底层的 SQL 错误（`no such column`）。
   - 这个错误导致 `/api/state` 接口返回 HTTP 500 崩溃。
   - 前端 `useProjectState.ts` 捕获到了这个网络错误，但静默处理了（只在控制台打印了 Error），导致所有的 React 状态（剧本、角色、场景分镜等）都保持初始的空状态。

这就是为什么您看到界面是一片空白，但本地文件夹里的素材其实都还在的原因。

---

### 💡 修复建议 (下一步计划)

既然您要求先不要改代码，我在这里先列出几种可行的修复方案供您参考。等您确认后，我可以立刻帮您实现：

**方案 A：在后端启动时自动同步数据库结构 (推荐)**
在 `desktop/lib/processManager.js` 或 `web/src/lib/db.ts` 中，检测如果是生产环境且数据库已存在，使用 Node.js 子进程自动在后台执行一次 `npx prisma db push --accept-data-loss`（或者使用 `better-sqlite3` 手动执行 `ALTER TABLE` 语句补齐缺失的字段）。

**方案 B：手动写一个轻量级的 SQLite 迁移脚本**
在 `getPrisma()` 初始化时，用 `better-sqlite3` 检查 `Scene` 表是否有 `startLayoutPrompt` 列，如果没有，就执行 `ALTER TABLE Scene ADD COLUMN startLayoutPrompt TEXT;` 等语句，把缺失的字段动态补上。这样是最安全且不需要依赖 npx 运行时的方案。

请问您希望采用哪种方式来修复这个问题？或者您有其他的想法吗？
