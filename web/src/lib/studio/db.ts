/**
 * Freedom Studio — 数据库操作
 *
 * 本文件提供 FsScript + FsAsset 表的 CRUD 操作。
 * 使用与旧系统 db.ts 相同的 getDb() 单例，但操作的是独立的表。
 *
 * ⚠️ 不修改任何旧系统代码，纯增量。
 *
 * 核心流程：剧本先行
 *   1. 用户创建/导入剧本 → FsScript
 *   2. AI 分析剧本 → 自动创建 FsAsset (scriptId 关联)
 *   3. 用户可修改/补充 AI 提取的资产
 */
import { eq, and, like, or, asc, SQL } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import * as schema from './schema';
import type {
  FsScript,
  FsScriptCreateInput,
  FsScriptUpdateInput,
  FsAsset,
  FsAssetType,
  FsAssetCreateInput,
  FsAssetUpdateInput,
  FsAssetSource,
  FsScriptAnalysis,
} from './types';

// ========================================
// 辅助函数
// ========================================

/** 将 DB 行转换为前端 FsScript 对象 */
function rowToScript(row: typeof schema.fsScripts.$inferSelect): FsScript {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    synopsis: row.synopsis,
    genre: row.genre,
    episodeCount: row.episodeCount,
    status: row.status as FsScript['status'],
    source: row.source as FsScript['source'],
    metadata: JSON.parse(row.metadata || '{}'),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** 将 DB 行转换为前端 FsAsset 对象 */
function rowToAsset(row: typeof schema.fsAssets.$inferSelect): FsAsset {
  return {
    id: row.id,
    scriptId: row.scriptId,
    type: row.type as FsAssetType,
    name: row.name,
    description: row.description,
    tags: JSON.parse(row.tags || '[]'),
    thumbnail: row.thumbnail,
    data: JSON.parse(row.data || '{}'),
    source: row.source as FsAssetSource,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function serializeJson(obj: unknown): string {
  return JSON.stringify(obj);
}

// ========================================
// 剧本 CRUD
// ========================================

/** 创建剧本 */
export function createScript(input: FsScriptCreateInput): FsScript {
  const db = getDb();
  const result = db.insert(schema.fsScripts).values({
    title: input.title,
    content: input.content ?? '',
    synopsis: input.synopsis ?? '',
    genre: input.genre ?? '',
    episodeCount: input.episodeCount ?? 1,
    source: input.source ?? 'manual',
    metadata: serializeJson(input.metadata ?? {}),
  }).returning().get();
  return rowToScript(result);
}

/** 根据 ID 获取剧本 */
export function getScriptById(id: string): FsScript | null {
  const db = getDb();
  const row = db.select().from(schema.fsScripts).where(eq(schema.fsScripts.id, id)).get();
  return row ? rowToScript(row) : null;
}

/** 获取剧本列表 */
export function listScripts(options?: {
  status?: FsScript['status'];
  search?: string;
}): FsScript[] {
  const db = getDb();
  const conditions: SQL[] = [];

  if (options?.status) {
    conditions.push(eq(schema.fsScripts.status, options.status));
  }
  if (options?.search) {
    const term = `%${options.search}%`;
    conditions.push(
      or(
        like(schema.fsScripts.title, term),
        like(schema.fsScripts.synopsis, term),
      )!
    );
  }

  const query = conditions.length > 0
    ? db.select().from(schema.fsScripts).where(and(...conditions)).orderBy(asc(schema.fsScripts.updatedAt))
    : db.select().from(schema.fsScripts).orderBy(asc(schema.fsScripts.updatedAt));

  return query.all().map(rowToScript);
}

/** 更新剧本 */
export function updateScript(id: string, input: FsScriptUpdateInput): FsScript | null {
  const db = getDb();

  const existing = db.select().from(schema.fsScripts).where(eq(schema.fsScripts.id, id)).get();
  if (!existing) return null;

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.content !== undefined) updateData.content = input.content;
  if (input.synopsis !== undefined) updateData.synopsis = input.synopsis;
  if (input.genre !== undefined) updateData.genre = input.genre;
  if (input.episodeCount !== undefined) updateData.episodeCount = input.episodeCount;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.source !== undefined) updateData.source = input.source;
  if (input.metadata !== undefined) {
    const existingMeta = JSON.parse(existing.metadata || '{}');
    updateData.metadata = serializeJson({ ...existingMeta, ...input.metadata });
  }

  db.update(schema.fsScripts)
    .set(updateData)
    .where(eq(schema.fsScripts.id, id))
    .run();

  return getScriptById(id);
}

/** 删除剧本（同时删除其下所有资产） */
export function deleteScript(id: string): boolean {
  const db = getDb();
  // 先删资产
  db.delete(schema.fsAssets).where(eq(schema.fsAssets.scriptId, id)).run();
  // 再删剧本
  const result = db.delete(schema.fsScripts).where(eq(schema.fsScripts.id, id)).run();
  return result.changes > 0;
}

// ========================================
// 资产 CRUD
// ========================================

/** 创建资产 */
export function createAsset<T extends FsAssetType>(input: FsAssetCreateInput<T>): FsAsset {
  const db = getDb();
  const result = db.insert(schema.fsAssets).values({
    scriptId: input.scriptId,
    type: input.type,
    name: input.name,
    description: input.description ?? '',
    tags: serializeJson(input.tags ?? []),
    thumbnail: input.thumbnail ?? null,
    source: input.source ?? 'ai_extracted',
    data: serializeJson(input.data),
  }).returning().get();
  return rowToAsset(result);
}

/** 根据 ID 获取资产 */
export function getAssetById(id: string): FsAsset | null {
  const db = getDb();
  const row = db.select().from(schema.fsAssets).where(eq(schema.fsAssets.id, id)).get();
  return row ? rowToAsset(row) : null;
}

/** 获取资产列表（按剧本筛选） */
export function listAssets(options?: {
  scriptId?: string;
  type?: FsAssetType;
  search?: string;
}): FsAsset[] {
  const db = getDb();
  const conditions: SQL[] = [];

  if (options?.scriptId) {
    conditions.push(eq(schema.fsAssets.scriptId, options.scriptId));
  }
  if (options?.type) {
    conditions.push(eq(schema.fsAssets.type, options.type));
  }
  if (options?.search) {
    const term = `%${options.search}%`;
    conditions.push(
      or(
        like(schema.fsAssets.name, term),
        like(schema.fsAssets.description, term),
      )!
    );
  }

  const query = conditions.length > 0
    ? db.select().from(schema.fsAssets).where(and(...conditions)).orderBy(asc(schema.fsAssets.name))
    : db.select().from(schema.fsAssets).orderBy(asc(schema.fsAssets.name));

  return query.all().map(rowToAsset);
}

/** 更新资产（支持 data 字段增量合并） */
export function updateAsset(id: string, input: FsAssetUpdateInput): FsAsset | null {
  const db = getDb();

  const existing = db.select().from(schema.fsAssets).where(eq(schema.fsAssets.id, id)).get();
  if (!existing) return null;

  const existingData = JSON.parse(existing.data || '{}');
  const mergedData = input.data
    ? { ...existingData, ...input.data }
    : existingData;

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.tags !== undefined) updateData.tags = serializeJson(input.tags);
  if (input.thumbnail !== undefined) updateData.thumbnail = input.thumbnail;
  if (input.data !== undefined) updateData.data = serializeJson(mergedData);

  db.update(schema.fsAssets)
    .set(updateData)
    .where(eq(schema.fsAssets.id, id))
    .run();

  return getAssetById(id);
}

/** 删除资产 */
export function deleteAsset(id: string): boolean {
  const db = getDb();
  const result = db.delete(schema.fsAssets).where(eq(schema.fsAssets.id, id)).run();
  return result.changes > 0;
}

/** 按 ID 列表批量获取资产 */
export function getAssetsByIds(ids: string[]): FsAsset[] {
  if (ids.length === 0) return [];
  const db = getDb();
  return db.select().from(schema.fsAssets)
    .where(or(...ids.map(id => eq(schema.fsAssets.id, id))))
    .all()
    .map(rowToAsset);
}

// ========================================
// AI 分析：从剧本提取资产
// ========================================

/**
 * 从 AI 分析结果批量创建资产
 *
 * AI 分析剧本后，将提取的角色/场景/道具批量写入 FsAsset 表。
 * 已存在的同名同类型资产会自动覆盖文字信息（描述、特征等），但保留其图片缩略图不变。
 */
export function createAssetsFromAnalysis(scriptId: string, analysis: FsScriptAnalysis): FsAsset[] {
  const db = getDb();
  const created: FsAsset[] = [];

  const existing = db.select().from(schema.fsAssets)
    .where(eq(schema.fsAssets.scriptId, scriptId))
    .all();
  const existingMap = new Map<string, typeof existing[0]>();
  for (const a of existing) {
    existingMap.set(`${a.type}:${a.name}`, a);
  }

  // 创建角色资产
  for (const char of analysis.characters) {
    const key = `character:${char.name}`;
    const oldAsset = existingMap.get(key);
    
    const description = `${char.personality} ${char.background}`.trim();
    const dataObj = {
        appearance: char.appearance,
        personality: char.personality,
        background: char.background,
        relationships: char.relationships,
        metadata: {
          gender: char.gender,
          age: char.age,
          occupation: char.occupation,
        },
    };

    if (oldAsset) {
      const updated = updateAsset(oldAsset.id, { description, data: dataObj });
      if (updated) created.push(updated);
    } else {
      const result = db.insert(schema.fsAssets).values({
        scriptId,
        type: 'character',
        name: char.name,
        description,
        tags: serializeJson([]),
        thumbnail: null,
        source: 'ai_extracted',
        data: serializeJson(dataObj),
      }).returning().get();
      created.push(rowToAsset(result));
    }
  }

  // 创建场景资产
  for (const scene of analysis.scenes) {
    const key = `scene:${scene.name}`;
    const oldAsset = existingMap.get(key);
    
    const description = scene.atmosphere;
    const dataObj = {
        atmosphere: scene.atmosphere,
        imagePrompt: scene.imagePrompt,
        timeOfDay: scene.timeOfDay,
        weather: scene.weather,
    };

    if (oldAsset) {
      const updated = updateAsset(oldAsset.id, { description, data: dataObj });
      if (updated) created.push(updated);
    } else {
      const result = db.insert(schema.fsAssets).values({
        scriptId,
        type: 'scene',
        name: scene.name,
        description,
        tags: serializeJson([]),
        thumbnail: null,
        source: 'ai_extracted',
        data: serializeJson(dataObj),
      }).returning().get();
      created.push(rowToAsset(result));
    }
  }

  // 创建道具资产
  for (const prop of analysis.props) {
    const key = `prop:${prop.name}`;
    const oldAsset = existingMap.get(key);
    
    const description = prop.imagePrompt;
    const dataObj = {
        category: prop.category,
        imagePrompt: prop.imagePrompt,
        sizeDescription: prop.sizeDescription,
        heldBy: prop.heldBy,
    };

    if (oldAsset) {
      const updated = updateAsset(oldAsset.id, { description, data: dataObj });
      if (updated) created.push(updated);
    } else {
      const result = db.insert(schema.fsAssets).values({
        scriptId,
        type: 'prop',
        name: prop.name,
        description,
        tags: serializeJson([]),
        thumbnail: null,
        source: 'ai_extracted',
        data: serializeJson(dataObj),
      }).returning().get();
      created.push(rowToAsset(result));
    }
  }

  return created;
}
