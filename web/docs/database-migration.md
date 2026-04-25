# Drizzle ORM + SQLite 动态本地数据库与增量同步机制 [v8.2]

为了彻底解决全量写入 JSON 的损坏问题，以及彻底摆脱 Prisma 在 Electron 桌面端打包时引发的恐怖 C++ ABI 编译错误，我们在 v8.2 架构中全面迁移至 **Drizzle ORM**，搭配原生的 `better-sqlite3`。

## 1. 动态绑定的外部 SQLite 存储
- 数据库文件并没有随代码提交在仓库中。我们使用 Drizzle 在运行时将 SQLite 数据库文件 (`viral-shorts.db`) 生成在 `WORKSPACE_PATH` 中。
- 我们采用了 Drizzle 的动态挂载特性，在 API 调用 `getDb()` 时自动执行 `migrate()` 运行 SQL 升级脚本，为新老用户自动无感应用最新表结构。

## 2. “补丁 (PATCH) 式”并发写策略与双保险热迁移
- **精准差异更新 (Deep Diff)**：前端通过对比计算出增量更新 (Diff)，发给 `PATCH /api/state`，并在后端利用 Drizzle 的原子化更新。
- **Prisma 时代遗留数据热迁移 (Hot Migration)**：在 `db.ts` 的 `getDb()` 中，如果发现遗留的 Prisma 格式库，系统会自动将其重命名为 `viral-shorts.bak.db`，创建新表，并**一行一行地**将老表数据映射注入新结构中。

## 开发者避坑指南 (Developer Gotchas)

> **以下错误已经在历史重构中发生过，请勿重蹈覆辙！**

### 1. 数据库 Schema 修改陷阱
由于我们移除了 Prisma 改用 Drizzle，如果你需要为表增加新字段：
- **错误示范**：直接去改 `schema.ts`，然后就去跑页面。
- **灾难后果**：Next.js 后端尝试查询新字段，但 SQLite 文件里并没有，直接报 500 崩溃。
- **正确做法**：修改 `web/src/lib/schema.ts` 后，**必须**在 web 目录下运行 `npx drizzle-kit generate`！这会在 `drizzle/` 目录下生成一个 SQL 文件。

### 2. React 状态与数据库持久化脱节陷阱 (The State Persistence Trap)
在新增任何 UI 功能时，极容易犯下“只管前端内存，不管后端落盘”的低级错误。
- **灾难后果**：这只是把数据存到了内存！只要用户刷新页面或者重启软件，这些内存状态瞬间灰飞烟灭！
- **正确做法**：当你向 `useProjectState.ts` 增加任何跨越刷新留存的业务字段时，**严格遵循这三步**：
  1. 在 `web/src/lib/schema.ts` 的对应模型中显式增加列；
  2. 运行 `npx drizzle-kit generate` 生成迁移 SQL；
  3. **最容易漏的一步**：在 `src/lib/db.ts` 的 `loadState` 和 `saveState` 里，**亲手**将新字段双向映射绑定进去！目前项目已经加入了 `stateMapping.test.ts` 来自动进行断言。
