import type { TargetType } from './types';

// ========================================
// 统一资源 URL 工具模块
// ========================================
// 集中管理：文件名生成、URL 生成、缓存破坏
// 所有资源相关的逻辑都应通过此模块，禁止在各 API route 中硬编码文件名规则。
//
// ⚠️ 本文件同时被客户端 (ProjectContext) 和服务端 (API routes) 引用，
//    不能使用 Node.js 专有模块（fs, path 等）。
//    服务端专用的函数（如 getAssetDir）仍在 db.ts 中。

/**
 * 根据 targetType 确定存储目录类型
 */
export function getAssetTypeForTarget(targetType: TargetType, mediaType?: string): 'images' | 'videos' | 'covers' {
  if (targetType === 'coverImage') return 'covers';
  if (targetType === 'sceneVideo' || mediaType === 'video') return 'videos';
  return 'images';
}

/**
 * 生成资源的 HTTP URL 路径（通过 /api/serve/ 代理）
 * 这是纯字符串操作，不依赖 Node.js 模块
 */
function buildAssetUrl(projectId: string, type: string, filename: string): string {
  return `/api/serve/${encodeURIComponent(projectId)}/${type}/${encodeURIComponent(filename)}`;
}

/**
 * 根据 targetType 和上下文生成确定性的文件名
 * 
 * @param targetType  资源目标类型
 * @param projectId   项目 ID
 * @param index       场景/角色索引
 * @param meta        额外元信息（如 ratio、charName）
 * @param mediaType   媒体类型（image/video）
 * @returns 确定性文件名（如 `测试2_S4_Img.png`）或随机 fallback 文件名
 */
export function generateAssetFilename(
  targetType: TargetType,
  projectId: string,
  index?: number,
  meta?: Record<string, any>,
  mediaType?: string
): string {
  const ext = mediaType === 'video' ? '.mp4' : '.png';
  
  switch (targetType) {
    case 'locationImage':
      return `场景${ext}`;
    case 'sceneLocationImage':
      return index !== undefined ? `场景_S${index}${ext}` : `场景_unknown${ext}`;
    case 'characterImage':
      if (meta?.charName) return `${meta.charName}${ext}`;
      return index !== undefined ? `${projectId}_Char${index}${ext}` : `char_${Date.now()}${ext}`;
    case 'sceneStartImage':
      return index !== undefined ? `${projectId}_S${index}_StartImg${ext}` : `start_${Date.now()}${ext}`;
    case 'sceneImage':
      return index !== undefined ? `${projectId}_S${index}_Img${ext}` : `img_${Date.now()}${ext}`;
    case 'sceneVideo':
      return index !== undefined ? `${projectId}_S${index}_Vid${ext}` : `vid_${Date.now()}${ext}`;
    case 'coverImage':
      if (meta?.ratio) return `cover_${meta.ratio.replace(':', 'x')}${ext}`;
      return `cover_${Date.now()}${ext}`;
    case 'scenelab_scene':
    case 'scenelab_char':
    case 'scenelab_result':
      return `scenelab_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    default:
      return `hitl_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
  }
}

/**
 * 生成带缓存破坏参数的资源 URL
 * 
 * @see 踩坑记录 #7：确定性文件名 + immutable 缓存 = 旧图永远不更新
 */
export function getAssetUrlWithCacheBust(
  projectId: string,
  assetType: string,
  filename: string
): string {
  return buildAssetUrl(projectId, assetType, filename) + `?v=${Date.now()}`;
}

/**
 * 给已有的本地资源 URL 追加/更新缓存破坏参数
 * 用于从 project.json 加载已保存 URL 时绕过浏览器缓存
 */
export function bustUrlCache(url: string): string {
  if (!url || !url.startsWith('/api/serve/')) return url;
  const base = url.split('?')[0];
  return `${base}?v=${Date.now()}`;
}

/**
 * 批量给 URL map 追加缓存破坏参数
 */
export function bustUrlCacheMap(map: Record<string | number, string>): Record<string | number, string> {
  const result: Record<string | number, string> = {};
  for (const [k, v] of Object.entries(map)) {
    result[k] = bustUrlCache(v);
  }
  return result;
}
