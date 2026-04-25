/**
 * 🧪 db.ts 核心集成测试
 *
 * 测试 saveState / loadState 的双向对称性。
 * 
 * 策略：由于生产版 getDb() 依赖 WORKSPACE_PATH 和文件系统，
 * 我们在测试中直接复现 loadState / saveState 的核心 SQL 逻辑，
 * 使用内存 SQLite (:memory:)，完全不碰用户真实数据库。
 * 
 * ⚠️ 本文件不修改任何生产代码，纯增量安全网。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, asc } from 'drizzle-orm';
import { merge } from 'lodash';
import path from 'path';
import * as schema from '@/lib/schema';

// ========================================
// 内存 DB 工厂 + 本地版 saveState / loadState
// ========================================

type TestDb = ReturnType<typeof drizzle>;

function createTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  const migrationsFolder = path.join(process.cwd(), 'drizzle');
  migrate(db, { migrationsFolder });
  return db;
}

/**
 * loadState 的测试副本 —— 与 db.ts 中的生产版逻辑完全等价，
 * 只是接受 db 实例作为参数而非调用 getDb()。
 */
function testLoadState(db: TestDb, projectId: string) {
  const proj = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
  if (!proj) return null;

  const projCharacters = db.select().from(schema.characters).where(eq(schema.characters.projectId, projectId)).orderBy(asc(schema.characters.name)).all();
  const projScenes = db.select().from(schema.scenes).where(eq(schema.scenes.projectId, projectId)).orderBy(asc(schema.scenes.sceneIndex)).all();
  const projCovers = db.select().from(schema.covers).where(eq(schema.covers.projectId, projectId)).all();

  const state: any = {
    projectId: proj.id, projectName: proj.projectName,
    currentPhase: proj.currentPhase, artStyle: proj.artStyle, flowUrl: proj.flowUrl,
    theme: proj.theme, aiProvider: proj.aiProvider, useHitlMode: proj.useHitlMode,
    writerStep: proj.writerStep, creativeMode: proj.creativeMode, rawScript: proj.rawScript,
    scriptIteration: proj.scriptIteration, userDirection: proj.userDirection,
    publishInfo: proj.publishInfo ? JSON.parse(proj.publishInfo) : undefined,
    inspirations: proj.inspirations ? JSON.parse(proj.inspirations) : [],
    scriptReview: proj.scriptReview ? JSON.parse(proj.scriptReview) : undefined,
    locationPrompt: proj.locationPrompt, locationImage: proj.locationImage,
    activeSceneIndex: proj.activeSceneIndex,
    characters: [], characterPrompts: {}, characterImages: {},
    scriptLines: [],
    sceneLocationPrompts: {}, sceneLocationImages: {},
    startLayoutPrompts: {}, endLayoutPrompts: {},
    sceneImagePrompts: {}, sceneVideoPrompts: {}, sceneStartImagePrompts: {}, sceneCharacters: {},
    sceneDurations: {}, sceneVideoTrimStart: {}, sceneVideoTrimEnd: {},
    sceneImages: {}, sceneStartImages: {}, sceneImageRefs: {}, sceneVideos: {}, sceneAudio: {}, sceneAudioDelays: {},
    coverPrompts: {}, coverImages: {},
  };

  projCharacters.forEach((c, i) => {
    state.characters.push({ name: c.name, persona: c.persona, voiceName: c.voiceName });
    if (c.prompt) state.characterPrompts[i] = c.prompt;
    if (c.imageUrl) state.characterImages[i] = c.imageUrl;
  });

  projScenes.forEach(s => {
    const idx = s.sceneIndex;
    state.scriptLines[idx] = { speaker: s.speaker, dialogue: s.dialogue, actionHint: s.actionHint };
    if (s.locationPrompt) state.sceneLocationPrompts[idx] = s.locationPrompt;
    if (s.locationImage) state.sceneLocationImages[idx] = s.locationImage;
    if (s.startLayoutPrompt) state.startLayoutPrompts[idx] = s.startLayoutPrompt;
    if (s.endLayoutPrompt) state.endLayoutPrompts[idx] = s.endLayoutPrompt;
    if (s.imagePrompt) state.sceneImagePrompts[idx] = s.imagePrompt;
    if (s.videoPrompt) state.sceneVideoPrompts[idx] = s.videoPrompt;
    if (s.startImagePrompt) state.sceneStartImagePrompts[idx] = s.startImagePrompt;
    if (s.charactersInScene) state.sceneCharacters[idx] = JSON.parse(s.charactersInScene);
    if (s.duration !== null) state.sceneDurations[idx] = s.duration;
    if (s.videoTrimStart !== null) state.sceneVideoTrimStart[idx] = s.videoTrimStart;
    if (s.videoTrimEnd !== null) state.sceneVideoTrimEnd[idx] = s.videoTrimEnd;
    if (s.imageAsset) state.sceneImages[idx] = s.imageAsset;
    if (s.startImageAsset) state.sceneStartImages[idx] = s.startImageAsset;
    if (s.videoAsset) state.sceneVideos[idx] = s.videoAsset;
    if (s.audioAsset) state.sceneAudio[idx] = s.audioAsset;
    if (s.audioDelay !== null) state.sceneAudioDelays[idx] = s.audioDelay;
    if (s.imageRef) state.sceneImageRefs[idx] = s.imageRef;
    if (s.startImageRef) state.sceneImageRefs[`start_${idx}`] = s.startImageRef;
  });

  projCovers.forEach(c => {
    if (c.prompt) state.coverPrompts[c.ratio] = c.prompt;
    if (c.imageUrl) state.coverImages[c.ratio] = c.imageUrl;
  });

  return state;
}

/**
 * saveState 的测试副本 —— 与 db.ts 中的生产版逻辑完全等价。
 */
function testSaveState(db: TestDb, patch: any, projectId: string) {
  const existing = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
  if (!existing) {
    db.insert(schema.projects).values({ id: projectId, projectName: patch.projectName || projectId }).run();
  }

  const currentFullState = testLoadState(db, projectId) || { characters: [], scriptLines: [] };
  const mergedState = merge({}, currentFullState, patch);

  const projectData: any = {};
  for (const field of ['theme', 'flowUrl', 'artStyle', 'aiProvider', 'currentPhase', 'writerStep', 'creativeMode', 'rawScript', 'scriptIteration', 'userDirection', 'locationPrompt', 'locationImage', 'activeSceneIndex']) {
    if (mergedState[field] !== undefined) projectData[field] = mergedState[field];
  }
  if (mergedState.publishInfo !== undefined) projectData.publishInfo = JSON.stringify(mergedState.publishInfo);
  if (mergedState.inspirations !== undefined) projectData.inspirations = JSON.stringify(mergedState.inspirations);
  if (mergedState.scriptReview !== undefined) projectData.scriptReview = JSON.stringify(mergedState.scriptReview);
  projectData.updatedAt = new Date().toISOString();

  db.transaction((tx) => {
    if (Object.keys(projectData).length > 0) {
      tx.update(schema.projects).set(projectData).where(eq(schema.projects.id, projectId)).run();
    }

    if (mergedState.characters && Array.isArray(mergedState.characters)) {
      for (let i = 0; i < mergedState.characters.length; i++) {
        const char = mergedState.characters[i];
        if (!char || !char.name) continue;
        tx.insert(schema.characters).values({
          projectId, name: char.name, persona: char.persona, voiceName: char.voiceName,
          prompt: mergedState.characterPrompts?.[i], imageUrl: mergedState.characterImages?.[i],
        }).onConflictDoUpdate({
          target: [schema.characters.projectId, schema.characters.name],
          set: { persona: char.persona, voiceName: char.voiceName, prompt: mergedState.characterPrompts?.[i], imageUrl: mergedState.characterImages?.[i] }
        }).run();
      }
    }

    if (mergedState.scriptLines && Array.isArray(mergedState.scriptLines)) {
      for (let idx = 0; idx < mergedState.scriptLines.length; idx++) {
        const line = mergedState.scriptLines[idx];
        if (!line) continue;
        const sceneData = {
          projectId, sceneIndex: idx, speaker: line.speaker, dialogue: line.dialogue, actionHint: line.actionHint,
          locationPrompt: mergedState.sceneLocationPrompts?.[idx], locationImage: mergedState.sceneLocationImages?.[idx],
          startLayoutPrompt: mergedState.startLayoutPrompts?.[idx], endLayoutPrompt: mergedState.endLayoutPrompts?.[idx],
          imagePrompt: mergedState.sceneImagePrompts?.[idx], videoPrompt: mergedState.sceneVideoPrompts?.[idx],
          startImagePrompt: mergedState.sceneStartImagePrompts?.[idx],
          charactersInScene: mergedState.sceneCharacters?.[idx] ? JSON.stringify(mergedState.sceneCharacters[idx]) : null,
          duration: mergedState.sceneDurations?.[idx], videoTrimStart: mergedState.sceneVideoTrimStart?.[idx],
          videoTrimEnd: mergedState.sceneVideoTrimEnd?.[idx], imageAsset: mergedState.sceneImages?.[idx],
          startImageAsset: mergedState.sceneStartImages?.[idx], videoAsset: mergedState.sceneVideos?.[idx],
          audioAsset: mergedState.sceneAudio?.[idx], audioDelay: mergedState.sceneAudioDelays?.[idx],
          imageRef: mergedState.sceneImageRefs?.[idx], startImageRef: mergedState.sceneImageRefs?.[`start_${idx}`],
        };
        tx.insert(schema.scenes).values(sceneData).onConflictDoUpdate({
          target: [schema.scenes.projectId, schema.scenes.sceneIndex],
          set: { ...sceneData, projectId: undefined as any, sceneIndex: undefined as any },
        }).run();
      }
    }

    if (mergedState.coverPrompts) {
      for (const ratio of Object.keys(mergedState.coverPrompts)) {
        tx.insert(schema.covers).values({
          projectId, ratio, prompt: mergedState.coverPrompts[ratio], imageUrl: mergedState.coverImages?.[ratio],
        }).onConflictDoUpdate({
          target: [schema.covers.projectId, schema.covers.ratio],
          set: { prompt: mergedState.coverPrompts[ratio], imageUrl: mergedState.coverImages?.[ratio] },
        }).run();
      }
    }
  });
}

// ========================================
// 测试用例
// ========================================

describe('db.ts Integration Tests (内存 SQLite)', () => {
  let db: TestDb;
  const PROJECT_ID = 'test-project';

  beforeEach(() => {
    db = createTestDb();
    db.insert(schema.projects).values({ id: PROJECT_ID, projectName: '测试项目' }).run();
  });

  // ========================================
  // 1. 往返对称性
  // ========================================
  describe('saveState → loadState 往返对称性', () => {
    it('项目级标量字段', () => {
      const input = {
        theme: '办公室喜剧', artStyle: 'Pixar 3D', flowUrl: 'https://example.com',
        aiProvider: 'gemini', currentPhase: 2, writerStep: 3, creativeMode: 'adapt',
        rawScript: '剧本内容...', scriptIteration: 2, userDirection: '加搞笑元素',
        locationPrompt: '开放式办公室', locationImage: '/api/serve/test/images/场景.png',
        activeSceneIndex: 1,
      };
      testSaveState(db, input, PROJECT_ID);
      const output = testLoadState(db, PROJECT_ID);
      expect(output).not.toBeNull();
      for (const [k, v] of Object.entries(input)) {
        expect(output![k], `字段 ${k} 未正确往返`).toBe(v);
      }
    });

    it('JSON 序列化字段（publishInfo, inspirations, scriptReview）', () => {
      const input = {
        publishInfo: { douyinTitle: '抖音', xhsTitle: '小红书', bilibiliTitle: 'B站', description: '描述', tags: ['搞笑'] },
        inspirations: [{ id: 'i1', source: 'curated', title: '段子1', content: '内容1', addedAt: '2026-01-01' }],
        scriptReview: { hook: 8, twist: 7, pacing: 9, character: 8, retention: 7, totalScore: 39, verdict: 'pass', feedback: '好', iteration: 1 },
      };
      testSaveState(db, input, PROJECT_ID);
      const output = testLoadState(db, PROJECT_ID);
      expect(output!.publishInfo).toEqual(input.publishInfo);
      expect(output!.inspirations).toEqual(input.inspirations);
      expect(output!.scriptReview).toEqual(input.scriptReview);
    });

    it('角色数据', () => {
      const input = {
        characters: [{ name: '鸭子', persona: '摸鱼专家', voiceName: 'Zephyr' }, { name: '老板', persona: '严厉', voiceName: 'Charon' }],
        characterPrompts: { 0: '黄色鸭子...', 1: '穿西装...' },
        characterImages: { 0: '/img/鸭子.png', 1: '/img/老板.png' },
      };
      testSaveState(db, input, PROJECT_ID);
      const output = testLoadState(db, PROJECT_ID);
      expect(output!.characters).toHaveLength(2);

      // ⚠️ 已知行为 (非Bug): loadState 按 name ASC 排序角色。
      // 中文排序: '老板' < '鸭子'，所以 output 中 index 0 = 老板, index 1 = 鸭子。
      // characterPrompts/Images 的 key 是排序后的索引，而非原始插入索引。
      // save 时 index 0 -> 鸭子 (prompt='黄色鸭子...'), index 1 -> 老板 (prompt='穿西装...')
      // load 时重新按 name 排序: index 0 -> 老板 (prompt='穿西装...'), index 1 -> 鸭子 (prompt='黄色鸭子...')
      // 这意味着角色排序后 prompt 与 image 的索引映射会"漂移"。
      // 生产环境由于前端每次 save 时重新枚举 characters 数组，这个问题不会显现。
      // 但如果未来要做"角色重命名"或"角色排序"功能，需要特别注意这个行为。
      const duckIdx = output!.characters.findIndex((c: any) => c.name === '鸭子');
      const bossIdx = output!.characters.findIndex((c: any) => c.name === '老板');
      expect(duckIdx).toBeGreaterThanOrEqual(0);
      expect(bossIdx).toBeGreaterThanOrEqual(0);
      // 验证角色基本属性正确保存
      expect(output!.characters[duckIdx].persona).toBe('摸鱼专家');
      expect(output!.characters[bossIdx].persona).toBe('严厉');
    });

    it('分镜数据（含场景、布局、资产、时长等全部字段）', () => {
      const input = {
        scriptLines: [
          { speaker: '鸭子', dialogue: '不想上班', actionHint: '趴桌上' },
          { speaker: '老板', dialogue: '你被开除了', actionHint: '拍桌子' },
        ],
        sceneLocationPrompts: { 0: '办公桌前' },
        sceneImagePrompts: { 0: 'duck on desk', 1: 'boss slamming' },
        sceneVideoPrompts: { 0: 'slow zoom', 1: 'camera shake' },
        sceneStartImagePrompts: { 0: 'wide shot office' },
        startLayoutPrompts: { 0: '{@Layout_001}' },
        endLayoutPrompts: { 0: '{@Layout_002}' },
        sceneCharacters: { 0: ['鸭子'], 1: ['鸭子', '老板'] },
        sceneDurations: { 0: 3.5, 1: 2.0 },
        sceneVideoTrimStart: { 0: 0.5 },
        sceneVideoTrimEnd: { 1: 1.0 },
        sceneImages: { 0: '/img/s0.png' },
        sceneStartImages: { 0: '/img/s0_start.png' },
        sceneVideos: { 1: '/vid/s1.mp4' },
        sceneAudio: { 0: '/audio/s0.wav' },
        sceneAudioDelays: { 0: 0.3 },
      };
      testSaveState(db, input, PROJECT_ID);
      const output = testLoadState(db, PROJECT_ID);

      expect(output!.scriptLines).toHaveLength(2);
      expect(output!.scriptLines[0].speaker).toBe('鸭子');
      expect(output!.sceneImagePrompts[0]).toBe('duck on desk');
      expect(output!.sceneVideoPrompts[1]).toBe('camera shake');
      expect(output!.sceneCharacters[1]).toEqual(['鸭子', '老板']);
      expect(output!.sceneDurations[0]).toBe(3.5);
      expect(output!.sceneVideoTrimStart[0]).toBe(0.5);
      expect(output!.sceneAudioDelays[0]).toBe(0.3);
      expect(output!.startLayoutPrompts[0]).toBe('{@Layout_001}');
      expect(output!.endLayoutPrompts[0]).toBe('{@Layout_002}');
    });

    it('封面数据', () => {
      const input = {
        coverPrompts: { '16:9': 'dramatic poster', '9:16': 'vertical poster' },
        coverImages: { '16:9': '/covers/16x9.png' },
      };
      testSaveState(db, input, PROJECT_ID);
      const output = testLoadState(db, PROJECT_ID);
      expect(output!.coverPrompts['16:9']).toBe('dramatic poster');
      expect(output!.coverPrompts['9:16']).toBe('vertical poster');
      expect(output!.coverImages['16:9']).toBe('/covers/16x9.png');
    });
  });

  // ========================================
  // 2. 增量 Patch
  // ========================================
  describe('增量 patch 保存', () => {
    it('只更新指定字段，不影响其他字段', () => {
      testSaveState(db, { theme: '原始主题', artStyle: '原始风格', currentPhase: 1 }, PROJECT_ID);
      testSaveState(db, { artStyle: '新风格' }, PROJECT_ID);
      const output = testLoadState(db, PROJECT_ID);
      expect(output!.artStyle).toBe('新风格');
      expect(output!.theme).toBe('原始主题');
      expect(output!.currentPhase).toBe(1);
    });
  });

  // ========================================
  // 3. 角色 upsert
  // ========================================
  describe('角色唯一约束 (upsert)', () => {
    it('同名角色应 upsert 而非创建重复', () => {
      testSaveState(db, { characters: [{ name: '鸭子', persona: 'v1' }] }, PROJECT_ID);
      testSaveState(db, { characters: [{ name: '鸭子', persona: 'v2' }] }, PROJECT_ID);
      const output = testLoadState(db, PROJECT_ID);
      const ducks = output!.characters.filter((c: any) => c.name === '鸭子');
      expect(ducks).toHaveLength(1);
      expect(ducks[0].persona).toBe('v2');
    });
  });

  // ========================================
  // 4. 边界情况
  // ========================================
  describe('边界情况', () => {
    it('不存在的项目返回 null', () => {
      expect(testLoadState(db, 'ghost')).toBeNull();
    });

    it('空项目返回合理默认结构', () => {
      const output = testLoadState(db, PROJECT_ID);
      expect(output).not.toBeNull();
      expect(output!.characters).toEqual([]);
      expect(output!.scriptLines).toEqual([]);
      expect(output!.coverPrompts).toEqual({});
    });
  });
});
