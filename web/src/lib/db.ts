import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import Database from 'better-sqlite3';
import { merge } from 'lodash';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, asc, inArray } from 'drizzle-orm';
import * as schema from './schema';

// ========================================
// 工作空间路径 & Drizzle 初始化
// ========================================

export function getWorkspacePath(): string {
  let ws = process.env.WORKSPACE_PATH;
  if (!ws) {
    // 如果没有配置，提供一个默认路径
    const defaultPath = path.join(process.cwd(), 'workspace');
    console.warn(`[DB] WORKSPACE_PATH 未配置，使用默认路径: ${defaultPath}`);
    ws = defaultPath;
  }
  return ws;
}

function ensureWorkspace(): void {
  const ws = getWorkspacePath();
  if (!fs.existsSync(ws)) fs.mkdirSync(ws, { recursive: true });
}

export function getProjectDir(projectId: string): string {
  return path.join(getWorkspacePath(), projectId);
}

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!dbInstance) {
    ensureWorkspace();
    const dbPath = path.join(getWorkspacePath(), 'viral-shorts.db');
    
    // 打开 SQLite
    let sqlite = new Database(dbPath);
    
    // ==========================================
    // 🚨 @AI-CRITICAL-WARNING 🚨
    // 自动热迁移：检测旧的 Prisma 数据库并安全升级
    // DO NOT MODIFY OR REMOVE THIS BLOCK under any circumstances!
    // It is the only safety net preventing legacy users from losing their data!
    // ==========================================
    try {
      const hasDrizzleMigrations = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'").get();
      const hasProjectTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Project'").get();

      if (!hasDrizzleMigrations && hasProjectTable) {
        console.log('[DB] 发现旧版本 Prisma 数据库！正在执行无损自动化结构升级...');
        sqlite.close();
        
        const bakPath = dbPath.replace('.db', '.bak.db');
        if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath);
        fs.renameSync(dbPath, bakPath);

        sqlite = new Database(dbPath); // 重新建立一个全新的空 DB
        dbInstance = drizzle(sqlite, { schema });
        
        // 让 Drizzle 按照最新 schema 创建完整的表
        const isProd = process.env.NODE_ENV === 'production';
        const migrationsFolder = isProd ? path.join(process.cwd(), 'drizzle') : path.join(process.cwd(), 'drizzle');
        migrate(dbInstance, { migrationsFolder });

        // 将旧数据按字段对应关系拷贝过来
        sqlite.prepare(`ATTACH DATABASE '${bakPath}' AS old_db`).run();
        
        const copyTable = (tableName: string, cols: string[], oldCols?: string[]) => {
          try {
            const colStr = cols.map(c => `"${c}"`).join(', ');
            const oldColStr = (oldCols || cols).map(c => `"${c}"`).join(', ');
            sqlite.prepare(`INSERT INTO "${tableName}" (${colStr}) SELECT ${oldColStr} FROM old_db."${tableName}"`).run();
            console.log(`[DB] 成功迁移表数据: ${tableName}`);
          } catch(e: any) {
            console.error(`[DB] 迁移表数据失败 ${tableName}:`, e.message);
          }
        };

        copyTable('Project', [
          'id', 'projectName', 'createdAt', 'updatedAt', 'currentPhase', 'artStyle', 'flowUrl', 'theme', 'aiProvider',
          'useHitlMode', 'writerStep', 'creativeMode', 'rawScript', 'scriptIteration', 'userDirection', 'publishInfo',
          'inspirations', 'scriptReview', 'locationPrompt', 'locationImage', 'activeSceneIndex'
        ]);
        
        copyTable('Character', ['id', 'projectId', 'name', 'persona', 'voiceName', 'prompt', 'imageUrl']);
        copyTable('Cover', ['id', 'projectId', 'ratio', 'prompt', 'imageUrl']);
        copyTable('InboxMessage', ['id', 'url', 'mediaType', 'targetType', 'referenceKeyword', 'index', 'meta', 'timestamp']);
        
        copyTable('Scene', [
          'id', 'projectId', 'sceneIndex', 'speaker', 'dialogue', 'actionHint', 'locationPrompt', 
          'startLayoutPrompt', 'endLayoutPrompt', 'imagePrompt', 'videoPrompt', 'startImagePrompt', 'locationImage', 
          'imageAsset', 'startImageAsset', 'videoAsset', 'audioAsset', 'imageRef', 'startImageRef', 'charactersInScene', 
          'duration', 'videoTrimStart', 'videoTrimEnd', 'audioDelay'
        ]);

        sqlite.prepare(`DETACH DATABASE old_db`).run();
        console.log('[DB] 旧版本数据库升级圆满完成！');
        
        return dbInstance;
      }
    } catch (e) {
      console.error('[DB] 旧版本数据库检测/升级失败:', e);
    }
    
    // 初始化 Drizzle (常规情况)
    dbInstance = drizzle(sqlite, { schema });

    console.log('[DB] Running Drizzle migrations...');
    try {
      // 在 Next.js 运行目录寻找 drizzle 文件夹
      const isProd = process.env.NODE_ENV === 'production';
      const migrationsFolder = isProd 
        ? path.join(process.cwd(), 'drizzle') 
        : path.join(process.cwd(), 'drizzle');
        
      if (fs.existsSync(migrationsFolder)) {
        migrate(dbInstance, { migrationsFolder });
        console.log('[DB] Migrations applied successfully.');
      } else {
        console.warn(`[DB] Migrations folder not found at ${migrationsFolder}. Run drizzle-kit generate.`);
      }
    } catch (e) {
      console.error('[DB] Failed to run migrations:', e);
    }
  }
  return dbInstance;
}

// 兼容老代码的桩函数，平滑过渡期间可能有用
export function getPrisma() {
  throw new Error('getPrisma() has been replaced by getDb() and Drizzle ORM.');
}

// ========================================
// 自动热迁移 (project.json -> SQLite)
// ========================================

export async function migrateIfNeeded(projectId: string) {
  const jsonPath = path.join(getProjectDir(projectId), 'project.json');
  if (!fs.existsSync(jsonPath)) return; // No legacy JSON to migrate
  
  const db = getDb();
  const existing = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
  if (existing) return; // Already in SQLite
  
  console.log(`[DB Migration] Migrating legacy project.json to SQLite for project: ${projectId}`);
  try {
    const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    // Do a full save to populate the relational tables
    await saveState(rawData, projectId);
    
    // Rename old file as backup
    fs.renameSync(jsonPath, path.join(getProjectDir(projectId), 'project.legacy.json.bak'));
    console.log(`[DB Migration] Migration successful for ${projectId}`);
  } catch (e) {
    console.error(`[DB Migration] Failed to migrate ${projectId}:`, e);
  }
}

// ========================================
// 项目 CRUD
// ========================================

export async function listProjects() {
  ensureWorkspace();
  const ws = getWorkspacePath();
  const entries = fs.readdirSync(ws, { withFileTypes: true });
  
  const db = getDb();
  const resultProjects = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    
    await migrateIfNeeded(entry.name);
    
    const proj = db.select().from(schema.projects).where(eq(schema.projects.id, entry.name)).get();
    
    if (proj) {
      const chars = db.select().from(schema.characters).where(eq(schema.characters.projectId, proj.id)).all();
      
      let coverUrl = '';
      if (chars.length > 0 && chars[0].imageUrl) {
        coverUrl = chars[0].imageUrl;
      }
      
      resultProjects.push({
        projectId: proj.id,
        projectName: proj.projectName,
        createdAt: new Date(proj.createdAt).toISOString(),
        updatedAt: new Date(proj.updatedAt).toISOString(),
        currentPhase: proj.currentPhase,
        coverUrl,
      });
    }
  }

  resultProjects.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return resultProjects;
}

export async function createProject(projectName: string) {
  ensureWorkspace();
  const projectId = projectName; 
  const projectDir = getProjectDir(projectId);

  if (fs.existsSync(projectDir)) {
    throw new Error(`项目「${projectName}」已存在！`);
  }

  const subDirs = ['scripts', 'images', 'videos', 'audio', 'exports'];
  for (const dir of subDirs) {
    fs.mkdirSync(path.join(projectDir, dir), { recursive: true });
  }

  const db = getDb();
  
  db.insert(schema.projects).values({
    id: projectId,
    projectName,
    currentPhase: 1,
    artStyle: 'Pixar 3D animated movie, highly detailed, vibrant colors',
  }).onConflictDoUpdate({
    target: schema.projects.id,
    set: {
      projectName,
      currentPhase: 1,
      artStyle: 'Pixar 3D animated movie, highly detailed, vibrant colors',
    }
  }).run();

  console.log(`[DB] Created/Updated project in SQLite: ${projectId}`);
  return { projectId, projectDir };
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const projectDir = getProjectDir(projectId);
  const db = getDb();
  
  try {
    db.delete(schema.projects).where(eq(schema.projects.id, projectId)).run();
  } catch (e) {
    // Ignore if not in DB
  }

  if (!fs.existsSync(projectDir)) return true;

  return new Promise((resolve) => {
    const script = process.platform === 'darwin' 
      ? `osascript -e 'tell application "Finder" to delete POSIX file "${projectDir}"'`
      : `rmdir /s /q "${projectDir}"`;
    exec(script, (err) => {
      if (err) {
        console.error(`[DB] Failed to trash project folder: ${err.message}`);
        resolve(false);
      } else {
        console.log(`[DB] Project moved to Trash: ${projectDir}`);
        resolve(true);
      }
    });
  });
}

export async function renameProject(oldId: string, newName: string): Promise<string> {
  const oldDir = getProjectDir(oldId);
  if (!fs.existsSync(oldDir)) throw new Error(`项目「${oldId}」不存在`);

  const newId = newName;
  const newDir = getProjectDir(newId);
  if (oldId === newId) return newId; 
  if (fs.existsSync(newDir)) throw new Error(`项目「${newName}」已存在`);

  fs.renameSync(oldDir, newDir);

  const db = getDb();
  db.update(schema.projects).set({
    id: newId,
    projectName: newName
  }).where(eq(schema.projects.id, oldId)).run();

  return newId;
}

// ========================================
// 项目状态读写 (Relational Mapping)
// ========================================

export async function loadState(projectId: string) {
  const db = getDb();
  const proj = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();

  if (!proj) return null;

  const projCharacters = db.select().from(schema.characters).where(eq(schema.characters.projectId, projectId)).orderBy(asc(schema.characters.name)).all();
  const projScenes = db.select().from(schema.scenes).where(eq(schema.scenes.projectId, projectId)).orderBy(asc(schema.scenes.sceneIndex)).all();
  const projCovers = db.select().from(schema.covers).where(eq(schema.covers.projectId, projectId)).all();

  // Fetch global settings
  const globalAiProvider = db.select().from(schema.systemStates).where(eq(schema.systemStates.key, 'aiProvider')).get()?.value || 'gemini';
  const globalJianyingPath = db.select().from(schema.systemStates).where(eq(schema.systemStates.key, 'jianyingPath')).get()?.value || '';
  const globalFlowUrl = db.select().from(schema.systemStates).where(eq(schema.systemStates.key, 'flowUrl')).get()?.value || '';

  // Reconstruct giant JSON for frontend compatibility
  const state: any = {
    projectId: proj.id,
    projectName: proj.projectName,
    currentPhase: proj.currentPhase,
    artStyle: proj.artStyle,
    flowUrl: globalFlowUrl,
    jianyingPath: globalJianyingPath,
    theme: proj.theme,
    aiProvider: globalAiProvider,
    useHitlMode: proj.useHitlMode,
    writerStep: proj.writerStep,
    creativeMode: proj.creativeMode,
    rawScript: proj.rawScript,
    scriptIteration: proj.scriptIteration,
    userDirection: proj.userDirection,
    publishInfo: proj.publishInfo ? JSON.parse(proj.publishInfo) : undefined,
    inspirations: proj.inspirations ? JSON.parse(proj.inspirations) : [],
    scriptReview: proj.scriptReview ? JSON.parse(proj.scriptReview) : undefined,
    locationPrompt: proj.locationPrompt,
    locationImage: proj.locationImage,
    activeSceneIndex: proj.activeSceneIndex,
    characters: [],
    characterPrompts: {},
    characterImages: {},
    scriptLines: [],
    sceneLocationPrompts: {}, sceneLocationImages: {},
    startLayoutPrompts: {}, endLayoutPrompts: {},
    sceneImagePrompts: {}, sceneVideoPrompts: {}, sceneStartImagePrompts: {}, sceneCharacters: {},
    sceneDurations: {}, sceneVideoTrimStart: {}, sceneVideoTrimEnd: {}, sceneImages: {}, sceneStartImages: {}, sceneImageRefs: {}, sceneVideos: {}, sceneAudio: {}, sceneAudioDelays: {},
    coverPrompts: {}, coverImages: {}
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
 * 🚨 @AI-CRITICAL-WARNING 🚨 STATE PERSISTENCE TRAP
 * If you add a new field to `useProjectState.ts`, you MUST:
 * 1. Add it to `src/lib/schema.ts`
 * 2. Run `npx drizzle-kit generate`
 * 3. Manually add the mapping logic inside this `saveState` function (in `projectData` and the transaction upserts below) and `loadState`.
 * Failure to map it here means the data will only live in React memory and vanish on refresh!
 */
export async function saveState(patch: any, projectId: string) {
  const db = getDb();
  
  // Create if not exists (for initial migration)
  const existing = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
  if (!existing) {
    db.insert(schema.projects).values({ id: projectId, projectName: patch.projectName || projectId }).run();
  }

  const currentFullState = (await loadState(projectId)) || { characters: [], scriptLines: [] };
  const mergedState = merge({}, currentFullState, patch);

  // Update Project table
  const projectData: any = {};
  for (const field of ['theme', 'artStyle', 'currentPhase', 'writerStep', 'creativeMode', 'rawScript', 'scriptIteration', 'userDirection', 'locationPrompt', 'locationImage', 'activeSceneIndex']) {
    if (mergedState[field] !== undefined) projectData[field] = mergedState[field];
  }
  if (mergedState.publishInfo !== undefined) projectData.publishInfo = JSON.stringify(mergedState.publishInfo);
  if (mergedState.inspirations !== undefined) projectData.inspirations = JSON.stringify(mergedState.inspirations);
  if (mergedState.scriptReview !== undefined) projectData.scriptReview = JSON.stringify(mergedState.scriptReview);

  projectData.updatedAt = new Date().toISOString();

  // Use a transaction for atomic relational updates
  db.transaction((tx) => {
    if (Object.keys(projectData).length > 0) {
      tx.update(schema.projects).set(projectData).where(eq(schema.projects.id, projectId)).run();
    }

    // Characters
    if (mergedState.characters && Array.isArray(mergedState.characters)) {
      for (let i = 0; i < mergedState.characters.length; i++) {
        const char = mergedState.characters[i];
        if (!char || !char.name) continue;
        
        tx.insert(schema.characters).values({
          projectId,
          name: char.name,
          persona: char.persona,
          voiceName: char.voiceName,
          prompt: mergedState.characterPrompts?.[i],
          imageUrl: mergedState.characterImages?.[i],
        }).onConflictDoUpdate({
          target: [schema.characters.projectId, schema.characters.name],
          set: {
            persona: char.persona,
            voiceName: char.voiceName,
            prompt: mergedState.characterPrompts?.[i],
            imageUrl: mergedState.characterImages?.[i],
          }
        }).run();
      }
    }

    // Scenes
    if (mergedState.scriptLines && Array.isArray(mergedState.scriptLines)) {
      for (let idx = 0; idx < mergedState.scriptLines.length; idx++) {
        const line = mergedState.scriptLines[idx];
        if (!line) continue;
        
        tx.insert(schema.scenes).values({
          projectId,
          sceneIndex: idx,
          speaker: line.speaker,
          dialogue: line.dialogue,
          actionHint: line.actionHint,
          locationPrompt: mergedState.sceneLocationPrompts?.[idx],
          locationImage: mergedState.sceneLocationImages?.[idx],
          startLayoutPrompt: mergedState.startLayoutPrompts?.[idx],
          endLayoutPrompt: mergedState.endLayoutPrompts?.[idx],
          imagePrompt: mergedState.sceneImagePrompts?.[idx],
          videoPrompt: mergedState.sceneVideoPrompts?.[idx],
          startImagePrompt: mergedState.sceneStartImagePrompts?.[idx],
          charactersInScene: mergedState.sceneCharacters?.[idx] ? JSON.stringify(mergedState.sceneCharacters[idx]) : null,
          duration: mergedState.sceneDurations?.[idx],
          videoTrimStart: mergedState.sceneVideoTrimStart?.[idx],
          videoTrimEnd: mergedState.sceneVideoTrimEnd?.[idx],
          imageAsset: mergedState.sceneImages?.[idx],
          startImageAsset: mergedState.sceneStartImages?.[idx],
          videoAsset: mergedState.sceneVideos?.[idx],
          audioAsset: mergedState.sceneAudio?.[idx],
          audioDelay: mergedState.sceneAudioDelays?.[idx],
          imageRef: mergedState.sceneImageRefs?.[idx],
          startImageRef: mergedState.sceneImageRefs?.[`start_${idx}`],
        }).onConflictDoUpdate({
          target: [schema.scenes.projectId, schema.scenes.sceneIndex],
          set: {
            speaker: line.speaker,
            dialogue: line.dialogue,
            actionHint: line.actionHint,
            locationPrompt: mergedState.sceneLocationPrompts?.[idx],
            locationImage: mergedState.sceneLocationImages?.[idx],
            startLayoutPrompt: mergedState.startLayoutPrompts?.[idx],
            endLayoutPrompt: mergedState.endLayoutPrompts?.[idx],
            imagePrompt: mergedState.sceneImagePrompts?.[idx],
            videoPrompt: mergedState.sceneVideoPrompts?.[idx],
            startImagePrompt: mergedState.sceneStartImagePrompts?.[idx],
            charactersInScene: mergedState.sceneCharacters?.[idx] ? JSON.stringify(mergedState.sceneCharacters[idx]) : null,
            duration: mergedState.sceneDurations?.[idx],
            videoTrimStart: mergedState.sceneVideoTrimStart?.[idx],
            videoTrimEnd: mergedState.sceneVideoTrimEnd?.[idx],
            imageAsset: mergedState.sceneImages?.[idx],
            startImageAsset: mergedState.sceneStartImages?.[idx],
            videoAsset: mergedState.sceneVideos?.[idx],
            audioAsset: mergedState.sceneAudio?.[idx],
            audioDelay: mergedState.sceneAudioDelays?.[idx],
            imageRef: mergedState.sceneImageRefs?.[idx],
            startImageRef: mergedState.sceneImageRefs?.[`start_${idx}`],
          }
        }).run();
      }
    }

    // Covers
    if (mergedState.coverPrompts) {
      for (const ratio of Object.keys(mergedState.coverPrompts)) {
        tx.insert(schema.covers).values({
          projectId, ratio,
          prompt: mergedState.coverPrompts[ratio],
          imageUrl: mergedState.coverImages?.[ratio]
        }).onConflictDoUpdate({
          target: [schema.covers.projectId, schema.covers.ratio],
          set: {
            prompt: mergedState.coverPrompts[ratio],
            imageUrl: mergedState.coverImages?.[ratio]
          }
        }).run();
      }
    }
  });

  return true;
}

// ========================================
// 资源路径工具
// ========================================

export type AssetType = 'images' | 'videos' | 'audio' | 'exports' | 'scripts' | 'covers';

export function getAssetDir(projectId: string, type: AssetType): string {
  const dir = path.join(getProjectDir(projectId), type);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getAssetUrl(projectId: string, type: AssetType, filename: string): string {
  return `/api/serve/${encodeURIComponent(projectId)}/${type}/${encodeURIComponent(filename)}`;
}
