import { z } from 'zod';
import { TARGET_TYPES } from './types';

// ========================================
// 运行时强类型校验 Schema
// ========================================

/**
 * 透传到 AI Gateway 并期望原样返回的元信息
 * 用于防止非法的 targetType 导致落盘失败或 Chrome 插件崩溃
 */
export const PassthroughMetaSchema = z.object({
  targetType: z.enum(TARGET_TYPES as unknown as [string, ...string[]]).optional(),
  index: z.number().optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

/**
 * 核心状态 API 更新 Payload 校验 (灰度模式使用)
 * 允许部分更新 (Partial)，所以所有字段都是 optional
 */
export const ProjectStateUpdateSchema = z.object({
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  
  artStyle: z.string().optional(),
  flowUrl: z.string().optional(),
  theme: z.string().optional(),
  currentPhase: z.number().optional(),
  
  publishInfo: z.object({
    douyinTitle: z.string(),
    xhsTitle: z.string(),
    bilibiliTitle: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
  }).optional(),
  
  coverPrompts: z.record(z.string(), z.string()).optional(),
  coverImages: z.record(z.string(), z.string()).optional(),
  
  characters: z.array(z.object({
    name: z.string(),
    persona: z.string(),
    isProtagonist: z.boolean(),
    voiceName: z.string().optional(),
    voice: z.string().optional(),
  })).optional(),
  
  scriptLines: z.array(z.object({
    speaker: z.string(),
    actionHint: z.string(),
    dialogue: z.string(),
  })).optional(),
  
  inspirations: z.array(z.any()).optional(),
  creativeMode: z.enum(['direct', 'adapt', 'reference']).optional(),
  rawScript: z.string().optional(),
  scriptReview: z.any().optional(),
  scriptIteration: z.number().optional(),
  writerStep: z.number().optional(),
  
  locationPrompt: z.string().optional(),
  locationImage: z.string().optional(),
  characterPrompts: z.record(z.string(), z.string()).optional(),
  characterImages: z.record(z.string(), z.string()).optional(),
  
  activeSceneIndex: z.number().optional(),
  sceneLocationPrompts: z.record(z.string(), z.string()).optional(),
  sceneLocationImages: z.record(z.string(), z.string()).optional(),
  sceneImagePrompts: z.record(z.string(), z.string()).optional(),
  sceneVideoPrompts: z.record(z.string(), z.string()).optional(),
  sceneStartImagePrompts: z.record(z.string(), z.string()).optional(),
  sceneCharacters: z.record(z.string(), z.array(z.string())).optional(),
  sceneDurations: z.record(z.string(), z.number()).optional(),
  sceneVideoTrimStart: z.record(z.string(), z.number()).optional(),
  sceneVideoTrimEnd: z.record(z.string(), z.number()).optional(),
  sceneImages: z.record(z.string(), z.string()).optional(),
  sceneStartImages: z.record(z.string(), z.string()).optional(),
  sceneVideos: z.record(z.string(), z.string()).optional(),
  sceneAudio: z.record(z.string(), z.string()).optional(),
  sceneAudioDelays: z.record(z.string(), z.number()).optional(),
}).passthrough(); // 目前采用 passthrough 允许未知字段通过，方便渐进式收紧
