/**
 * 🚨 @AI-CRITICAL-WARNING 🚨
 * DO NOT just edit this file!
 * After modifying, you MUST run `npx drizzle-kit generate` in the `web` folder.
 * The system will automatically apply migrations via `db.ts` at startup.
 */
import { sqliteTable, text, integer, real, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const projects = sqliteTable('Project', {
  id: text('id').primaryKey(),
  projectName: text('projectName').notNull(),
  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  currentPhase: integer('currentPhase').notNull().default(1),
  
  artStyle: text('artStyle'),
  flowUrl: text('flowUrl'),
  theme: text('theme'),
  aiProvider: text('aiProvider'),
  useHitlMode: integer('useHitlMode', { mode: 'boolean' }).notNull().default(true),
  jianyingPath: text('jianyingPath'),
  
  writerStep: integer('writerStep').notNull().default(1),
  creativeMode: text('creativeMode'),
  rawScript: text('rawScript'),
  scriptIteration: integer('scriptIteration').notNull().default(0),
  userDirection: text('userDirection'),
  
  publishInfo: text('publishInfo'),
  inspirations: text('inspirations'),
  scriptReview: text('scriptReview'),
  
  locationPrompt: text('locationPrompt'),
  locationImage: text('locationImage'),
  
  activeSceneIndex: integer('activeSceneIndex').notNull().default(0),
});

export const characters = sqliteTable('Character', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('projectId').notNull().references(() => projects.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  name: text('name').notNull(),
  persona: text('persona'),
  voiceName: text('voiceName'),
  prompt: text('prompt'),
  imageUrl: text('imageUrl'),
}, (t) => ({
  unq: unique().on(t.projectId, t.name),
}));

export const scenes = sqliteTable('Scene', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('projectId').notNull().references(() => projects.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  sceneIndex: integer('sceneIndex').notNull(),
  speaker: text('speaker'),
  dialogue: text('dialogue'),
  actionHint: text('actionHint'),
  locationPrompt: text('locationPrompt'),
  startLayoutPrompt: text('startLayoutPrompt'),
  endLayoutPrompt: text('endLayoutPrompt'),
  imagePrompt: text('imagePrompt'),
  videoPrompt: text('videoPrompt'),
  startImagePrompt: text('startImagePrompt'),
  locationImage: text('locationImage'),
  imageAsset: text('imageAsset'),
  startImageAsset: text('startImageAsset'),
  videoAsset: text('videoAsset'),
  audioAsset: text('audioAsset'),
  imageRef: text('imageRef'),
  startImageRef: text('startImageRef'),
  charactersInScene: text('charactersInScene'),
  duration: real('duration'),
  videoTrimStart: real('videoTrimStart'),
  videoTrimEnd: real('videoTrimEnd'),
  audioDelay: real('audioDelay'),
}, (t) => ({
  unq: unique().on(t.projectId, t.sceneIndex),
}));

export const covers = sqliteTable('Cover', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('projectId').notNull().references(() => projects.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  ratio: text('ratio').notNull(),
  prompt: text('prompt'),
  imageUrl: text('imageUrl'),
}, (t) => ({
  unq: unique().on(t.projectId, t.ratio),
}));

export const systemStates = sqliteTable('SystemState', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const inboxMessages = sqliteTable('InboxMessage', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  url: text('url').notNull(),
  mediaType: text('mediaType').notNull(),
  targetType: text('targetType').notNull(),
  referenceKeyword: text('referenceKeyword'),
  index: integer('index'),
  meta: text('meta'),
  timestamp: text('timestamp').notNull().default(sql`CURRENT_TIMESTAMP`),
});
