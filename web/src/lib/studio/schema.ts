/**
 * Freedom Studio — Schema
 *
 * 🚨 @AI-CRITICAL-WARNING 🚨
 * DO NOT just edit this file!
 * After modifying, you MUST run `npx drizzle-kit generate` in the `web` folder.
 * The system will automatically apply migrations via `db.ts` at startup.
 *
 * 本文件定义 Freedom Studio 新增的数据库表，使用 `Fs` 前缀，
 * 与旧系统表 (Project/Character/Scene/Cover/...) 完全隔离。
 *
 * 核心流程：剧本先行
 *   1. 用户创建/导入剧本 (FsScript)
 *   2. AI 分析剧本，自动提取角色/场景/道具 (FsAsset)
 *   3. 用户可修改/补充 AI 提取的资产
 *   4. 资产挂在剧本下 (scriptId 外键)
 */
import { sqliteTable, text, unique, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * 剧本表 — Freedom Studio 的核心
 *
 * 用户先有剧本，才有资产。剧本可以是：
 * - 用户自己写的
 * - 从灵感库选的
 * - AI 辅助生成的
 * - 外部导入的 (TXT/DOCX)
 */
export const fsScripts = sqliteTable('FsScript', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),                         // 剧本标题
  content: text('content').notNull().default(''),         // 剧本正文 (Markdown)
  synopsis: text('synopsis').notNull().default(''),       // 剧本简介/大纲
  genre: text('genre').notNull().default(''),             // 类型：喜剧/悬疑/爱情等
  episodeCount: integer('episodeCount').notNull().default(1), // 集数
  status: text('status').notNull().default('draft'),      // draft | analyzing | ready | producing
  source: text('source').notNull().default('manual'),     // manual | inspiration | ai_generated | imported
  metadata: text('metadata').notNull().default('{}'),     // JSON: 额外元数据
  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * 统一资产表 — 存储角色、场景、道具
 *
 * 通过 `type` 字段区分资产类型，`data` 字段存储类型特有数据 (JSON)。
 * 角色关系用 data 内的 `relationships` 文字描述，暂不做关系图。
 *
 * ⚠️ 资产挂在剧本下 (scriptId)，不是独立存在的。
 * AI 会根据剧本自动提取角色/场景/道具。
 */
export const fsAssets = sqliteTable('FsAsset', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  scriptId: text('scriptId').notNull(),                   // ⚠️ 必须关联剧本！
  type: text('type').notNull(),                           // 'character' | 'scene' | 'prop'
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  tags: text('tags').notNull().default('[]'),             // JSON array of strings
  thumbnail: text('thumbnail'),                           // 缩略图 URL
  data: text('data').notNull().default('{}'),             // JSON: 类型特有数据
  source: text('source').notNull().default('ai_extracted'), // ai_extracted | manual | imported
  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  // 同一剧本下同类型资产名称唯一
  unq: unique().on(t.scriptId, t.type, t.name),
}));
