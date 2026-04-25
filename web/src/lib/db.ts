import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import { merge } from 'lodash';

// ========================================
// 工作空间路径 & Prisma 初始化
// ========================================

export function getWorkspacePath(): string {
  const ws = process.env.WORKSPACE_PATH;
  if (!ws) throw new Error('WORKSPACE_PATH 未配置！请在 .env.local 中设置工作空间路径。');
  return ws;
}

function ensureWorkspace(): void {
  const ws = getWorkspacePath();
  if (!fs.existsSync(ws)) fs.mkdirSync(ws, { recursive: true });
}

export function getProjectDir(projectId: string): string {
  return path.join(getWorkspacePath(), projectId);
}

let prisma: PrismaClient;

export function getPrisma() {
  if (!prisma) {
    ensureWorkspace();
    const dbPath = path.join(getWorkspacePath(), 'viral-shorts.db');
    
    let shouldInitialize = false;
    if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0) {
      shouldInitialize = true;
    } else {
      // 检查表结构是否完整（针对旧版本残留的半成品数据库）
      try {
        const db = new Database(dbPath, { fileMustExist: true });
        const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Project'");
        const row = stmt.get();
        db.close();
        if (!row) {
          console.warn('[DB] Existing database is corrupted or incomplete. Re-initializing...');
          shouldInitialize = true;
        }
      } catch (e) {
        console.warn('[DB] Failed to read existing database. Re-initializing...', e);
        shouldInitialize = true;
      }
    }

    if (shouldInitialize) {
      console.log('[DB] Initializing new SQLite database with schema...');
      
      const isProd = process.env.NODE_ENV === 'production';
      let templatePath = '';
      
      if (isProd) {
        templatePath = process.env.PRISMA_TEMPLATE_PATH || '';
      } else {
        templatePath = path.join(process.cwd(), 'prisma', 'template.db');
      }

      if (templatePath && fs.existsSync(templatePath)) {
        console.log(`[DB] Copying template database from ${templatePath}`);
        fs.copyFileSync(templatePath, dbPath);
      } else {
        if (isProd) {
          throw new Error(`[DB] FATAL ERROR: Template database not found at ${templatePath}. Cannot initialize database in production!`);
        }
        console.log(`[DB] Template not found. Executing prisma db push (dev mode only)...`);
        fs.writeFileSync(dbPath, ''); // Ensure the file is at least created before pushing
        execSync(`npx prisma db push --accept-data-loss`, { 
          env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
          stdio: 'inherit'
        });
      }
    }

    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

// ========================================
// 自动热迁移 (project.json -> SQLite)
// ========================================

export async function migrateIfNeeded(projectId: string) {
  const jsonPath = path.join(getProjectDir(projectId), 'project.json');
  if (!fs.existsSync(jsonPath)) return; // No legacy JSON to migrate
  
  const p = getPrisma();
  const existing = await p.project.findUnique({ where: { id: projectId } });
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
  
  const p = getPrisma();
  const projects = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    
    // Auto trigger migration if legacy json exists
    await migrateIfNeeded(entry.name);
    
    const proj = await p.project.findUnique({ 
      where: { id: entry.name },
      include: { characters: true }
    });
    
    if (proj) {
      let coverUrl = '';
      if (proj.characters.length > 0 && proj.characters[0].imageUrl) {
        coverUrl = proj.characters[0].imageUrl;
      }
      
      projects.push({
        projectId: proj.id,
        projectName: proj.projectName,
        createdAt: proj.createdAt.toISOString(),
        updatedAt: proj.updatedAt.toISOString(),
        currentPhase: proj.currentPhase,
        coverUrl,
      });
    }
  }

  projects.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return projects;
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

  const p = getPrisma();
  await p.project.upsert({
    where: { id: projectId },
    update: {
      projectName,
      currentPhase: 1,
      artStyle: 'Pixar 3D animated movie, highly detailed, vibrant colors',
    },
    create: {
      id: projectId,
      projectName,
      currentPhase: 1,
      artStyle: 'Pixar 3D animated movie, highly detailed, vibrant colors',
    }
  });

  console.log(`[DB] Created/Updated project in SQLite: ${projectId}`);
  return { projectId, projectDir };
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const projectDir = getProjectDir(projectId);
  const p = getPrisma();
  
  try {
    await p.project.delete({ where: { id: projectId } });
  } catch (e) {
    // Ignore if not in DB
  }

  if (!fs.existsSync(projectDir)) return true;

  return new Promise((resolve) => {
    const script = `osascript -e 'tell application "Finder" to delete POSIX file "${projectDir}"'`;
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

  const p = getPrisma();
  await p.project.update({
    where: { id: oldId },
    data: { id: newId, projectName: newName }
  });

  return newId;
}

// ========================================
// 项目状态读写 (Relational Mapping)
// ========================================

export async function loadState(projectId: string) {
  const p = getPrisma();
  const proj = await p.project.findUnique({
    where: { id: projectId },
    include: { characters: { orderBy: { name: 'asc' } }, scenes: { orderBy: { sceneIndex: 'asc' } }, covers: true }
  });

  if (!proj) return null;

  // Reconstruct giant JSON for frontend compatibility
  const state: any = {
    projectId: proj.id,
    projectName: proj.projectName,
    currentPhase: proj.currentPhase,
    artStyle: proj.artStyle,
    flowUrl: proj.flowUrl,
    theme: proj.theme,
    aiProvider: proj.aiProvider,
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

  proj.characters.forEach((c, i) => {
    state.characters.push({ name: c.name, persona: c.persona, voiceName: c.voiceName });
    if (c.prompt) state.characterPrompts[i] = c.prompt;
    if (c.imageUrl) state.characterImages[i] = c.imageUrl;
  });

  proj.scenes.forEach(s => {
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

  proj.covers.forEach(c => {
    if (c.prompt) state.coverPrompts[c.ratio] = c.prompt;
    if (c.imageUrl) state.coverImages[c.ratio] = c.imageUrl;
  });

  return state;
}

export async function saveState(patch: any, projectId: string) {
  const p = getPrisma();
  
  // Create if not exists (for initial migration)
  const existing = await p.project.findUnique({ where: { id: projectId } });
  if (!existing) {
    await p.project.create({ data: { id: projectId, projectName: patch.projectName || projectId } });
  }

  // To properly handle partial PATCH updates that come as nested objects (e.g. { sceneImages: { "0": "url" } }),
  // we first load the existing full state, deep merge the patch, and then map back to relational models.
  // This is the easiest and safest way to handle arbitrary partial updates without a complex schema translator.
  
  const currentFullState = (await loadState(projectId)) || { characters: [], scriptLines: [] };
  const mergedState = merge({}, currentFullState, patch);

  // Update Project table
  const projectData: any = {};
  for (const field of ['theme', 'flowUrl', 'artStyle', 'aiProvider', 'currentPhase', 'writerStep', 'creativeMode', 'rawScript', 'scriptIteration', 'userDirection', 'locationPrompt', 'locationImage', 'activeSceneIndex']) {
    if (mergedState[field] !== undefined) projectData[field] = mergedState[field];
  }
  if (mergedState.publishInfo !== undefined) projectData.publishInfo = JSON.stringify(mergedState.publishInfo);
  if (mergedState.inspirations !== undefined) projectData.inspirations = JSON.stringify(mergedState.inspirations);
  if (mergedState.scriptReview !== undefined) projectData.scriptReview = JSON.stringify(mergedState.scriptReview);

  // Use a transaction for atomic relational updates
  await p.$transaction(async (tx: any) => {
    if (Object.keys(projectData).length > 0) {
      await tx.project.update({ where: { id: projectId }, data: projectData });
    }

    // Characters
    if (mergedState.characters && Array.isArray(mergedState.characters)) {
      for (let i = 0; i < mergedState.characters.length; i++) {
        const char = mergedState.characters[i];
        if (!char || !char.name) continue;
        await tx.character.upsert({
          where: { projectId_name: { projectId, name: char.name } },
          create: {
            projectId,
            name: char.name,
            persona: char.persona,
            voiceName: char.voiceName,
            prompt: mergedState.characterPrompts?.[i],
            imageUrl: mergedState.characterImages?.[i],
          },
          update: {
            persona: char.persona,
            voiceName: char.voiceName,
            prompt: mergedState.characterPrompts?.[i],
            imageUrl: mergedState.characterImages?.[i],
          }
        });
      }
    }

    // Scenes
    if (mergedState.scriptLines && Array.isArray(mergedState.scriptLines)) {
      for (let idx = 0; idx < mergedState.scriptLines.length; idx++) {
        const line = mergedState.scriptLines[idx];
        if (!line) continue;
        
        await tx.scene.upsert({
          where: { projectId_sceneIndex: { projectId, sceneIndex: idx } },
          create: {
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
          },
          update: {
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
        });
      }
    }

    // Covers
    if (mergedState.coverPrompts) {
      for (const ratio of Object.keys(mergedState.coverPrompts)) {
        await tx.cover.upsert({
          where: { projectId_ratio: { projectId, ratio } },
          create: {
            projectId, ratio,
            prompt: mergedState.coverPrompts[ratio],
            imageUrl: mergedState.coverImages?.[ratio]
          },
          update: {
            prompt: mergedState.coverPrompts[ratio],
            imageUrl: mergedState.coverImages?.[ratio]
          }
        });
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
