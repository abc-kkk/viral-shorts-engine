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
