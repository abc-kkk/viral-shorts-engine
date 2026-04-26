/**
 * Freedom Studio — 剧本+资产 集成测试
 */
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, and } from 'drizzle-orm';
import * as path from 'path';
import * as schema from '@/lib/studio/schema';

let db: ReturnType<typeof drizzle>;

beforeEach(() => {
  const sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
});

describe('FsScript CRUD', () => {
  it('should create a script', () => {
    const result = db.insert(schema.fsScripts).values({
      title: '测试剧本',
      content: '第一幕：黎明前的城市...',
      synopsis: '一个关于逆袭的故事',
      genre: 'drama',
      source: 'manual',
    }).returning().get();

    expect(result.id).toBeDefined();
    expect(result.title).toBe('测试剧本');
    expect(result.status).toBe('draft');
  });

  it('should read a script by id', () => {
    const created = db.insert(schema.fsScripts).values({ title: '读取测试', source: 'manual' }).returning().get();
    const found = db.select().from(schema.fsScripts).where(eq(schema.fsScripts.id, created.id)).get();
    expect(found!.title).toBe('读取测试');
  });

  it('should update a script', () => {
    const created = db.insert(schema.fsScripts).values({ title: '更新前', source: 'manual' }).returning().get();
    db.update(schema.fsScripts).set({ title: '更新后', status: 'ready' }).where(eq(schema.fsScripts.id, created.id)).run();
    const updated = db.select().from(schema.fsScripts).where(eq(schema.fsScripts.id, created.id)).get();
    expect(updated!.title).toBe('更新后');
    expect(updated!.status).toBe('ready');
  });

  it('should delete a script', () => {
    const created = db.insert(schema.fsScripts).values({ title: '删除测试', source: 'manual' }).returning().get();
    db.delete(schema.fsScripts).where(eq(schema.fsScripts.id, created.id)).run();
    const found = db.select().from(schema.fsScripts).where(eq(schema.fsScripts.id, created.id)).get();
    expect(found).toBeUndefined();
  });

  it('should list scripts', () => {
    db.insert(schema.fsScripts).values({ title: '剧本1', source: 'manual' }).run();
    db.insert(schema.fsScripts).values({ title: '剧本2', source: 'ai_generated' }).run();
    const all = db.select().from(schema.fsScripts).all();
    expect(all).toHaveLength(2);
  });
});

describe('FsAsset CRUD (script-scoped)', () => {
  let scriptId: string;

  beforeEach(() => {
    const script = db.insert(schema.fsScripts).values({ title: '资产测试剧本', source: 'manual' }).returning().get();
    scriptId = script.id;
  });

  it('should create an asset under a script', () => {
    const result = db.insert(schema.fsAssets).values({
      scriptId, type: 'character', name: '林逸', source: 'ai_extracted',
      data: JSON.stringify({ appearance: '高大帅气', relationships: '与苏婉是青梅竹马' }),
    }).returning().get();

    expect(result.scriptId).toBe(scriptId);
    expect(result.source).toBe('ai_extracted');
  });

  it('should list assets by scriptId', () => {
    const otherScript = db.insert(schema.fsScripts).values({ title: '其他剧本', source: 'manual' }).returning().get();
    db.insert(schema.fsAssets).values({ scriptId, type: 'character', name: 'A', source: 'manual' }).run();
    db.insert(schema.fsAssets).values({ scriptId, type: 'scene', name: 'B', source: 'manual' }).run();
    db.insert(schema.fsAssets).values({ scriptId: otherScript.id, type: 'character', name: 'C', source: 'manual' }).run();

    const scriptAssets = db.select().from(schema.fsAssets).where(eq(schema.fsAssets.scriptId, scriptId)).all();
    expect(scriptAssets).toHaveLength(2);
  });

  it('should filter by type and scriptId', () => {
    db.insert(schema.fsAssets).values({ scriptId, type: 'character', name: '角色1', source: 'manual' }).run();
    db.insert(schema.fsAssets).values({ scriptId, type: 'character', name: '角色2', source: 'manual' }).run();
    db.insert(schema.fsAssets).values({ scriptId, type: 'scene', name: '场景1', source: 'manual' }).run();

    const chars = db.select().from(schema.fsAssets)
      .where(and(eq(schema.fsAssets.scriptId, scriptId), eq(schema.fsAssets.type, 'character')))
      .all();
    expect(chars).toHaveLength(2);
  });

  it('should delete all assets when script is deleted', () => {
    db.insert(schema.fsAssets).values({ scriptId, type: 'character', name: 'A', source: 'manual' }).run();
    db.insert(schema.fsAssets).values({ scriptId, type: 'scene', name: 'B', source: 'manual' }).run();

    db.delete(schema.fsAssets).where(eq(schema.fsAssets.scriptId, scriptId)).run();
    db.delete(schema.fsScripts).where(eq(schema.fsScripts.id, scriptId)).run();

    const remaining = db.select().from(schema.fsAssets).where(eq(schema.fsAssets.scriptId, scriptId)).all();
    expect(remaining).toHaveLength(0);
  });
});

describe('Unique constraints', () => {
  let scriptId: string;

  beforeEach(() => {
    const script = db.insert(schema.fsScripts).values({ title: '唯一约束', source: 'manual' }).returning().get();
    scriptId = script.id;
  });

  it('should allow same name in different scripts', () => {
    const other = db.insert(schema.fsScripts).values({ title: '其他', source: 'manual' }).returning().get();
    const r1 = db.insert(schema.fsAssets).values({ scriptId, type: 'character', name: '林逸', source: 'manual' }).returning().get();
    const r2 = db.insert(schema.fsAssets).values({ scriptId: other.id, type: 'character', name: '林逸', source: 'manual' }).returning().get();
    expect(r1.id).not.toBe(r2.id);
  });

  it('should prevent duplicate name+type in same script', () => {
    db.insert(schema.fsAssets).values({ scriptId, type: 'character', name: '林逸', source: 'manual' }).run();
    expect(() => {
      db.insert(schema.fsAssets).values({ scriptId, type: 'character', name: '林逸', source: 'ai_extracted' }).run();
    }).toThrow();
  });

  it('should allow same name different type in same script', () => {
    const r1 = db.insert(schema.fsAssets).values({ scriptId, type: 'character', name: '花园', source: 'manual' }).returning().get();
    const r2 = db.insert(schema.fsAssets).values({ scriptId, type: 'scene', name: '花园', source: 'manual' }).returning().get();
    expect(r1.id).not.toBe(r2.id);
  });
});
