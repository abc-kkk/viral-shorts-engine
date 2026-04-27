/**
 * Freedom Studio — 统一生图服务 (generateFlow)
 *
 * 这是整个系统中所有 AI 生图请求的 **唯一入口**。
 * 它内部封装了：
 *   1. set-context（设置 Chrome 插件落盘的上下文）
 *   2. generate-assets（触发 Flow Automator）
 *
 * 调用者只需传入一个类型安全的 config 对象，
 * 内部自动处理 projectId 构造、文件命名、meta 路由等所有细节。
 *
 * === 使用规则 ===
 * ❌ 禁止：在任何页面/组件中直接调用 `/api/studio/assets/xxx/set-context` 或 `/api/generate-assets`
 * ✅ 正确：所有生图统一通过本模块的 `generateFlow()` 函数
 *
 * === 三种生图场景 ===
 * 1. 资产主图：角色/场景/道具卡片上的"生成"按钮
 * 2. 场景多角度：SceneAngleModal 中按角度生成
 * 3. 分镜帧图：Storyboard 页面中的首帧/尾帧生成
 */

import type { FsAsset } from '@/lib/studio/types';
import { getDefaultAssetPrompt } from '@/lib/studio/store/useStudioStore';
import { extractRefKeywords } from '@/lib/utils/promptParser';

// Re-export for consumers that import from this module
export { extractRefKeywords };

// ========================================
// 类型定义 — 使用可区分联合，编译器强制不遗漏字段
// ========================================

/** 资产主图：角色/场景/道具 */
interface AssetMainConfig {
  kind: 'asset';
  asset: FsAsset;
  scriptTitle: string;
  customPrompt?: string;
  artStyle?: string;
}

/** 场景多角度 */
interface SceneAngleConfig {
  kind: 'angle';
  asset: FsAsset;
  scriptTitle: string;
  angleKey: string;
  angleDesc: string;  // e.g. "Left 45-degree angle view"
  artStyle?: string;
}

/** 分镜首帧/尾帧 */
interface StoryboardFrameConfig {
  kind: 'storyboardFrame';
  scriptId: string;
  scriptTitle: string;
  shotId: string;
  shotIndex: number;      // 镜头全局序号（1-based）
  frameType: 'first' | 'last';
  prompt: string;
  referenceKeywords: string[];  // 从 prompt 中提取的 {@} 引用
}

/** 分镜视频 */
interface StoryboardVideoConfig {
  kind: 'storyboardVideo';
  scriptId: string;
  scriptTitle: string;
  shotId: string;
  shotIndex: number;
  prompt: string;
  referenceKeywords: string[];
}

export type GenerateFlowConfig = AssetMainConfig | SceneAngleConfig | StoryboardFrameConfig | StoryboardVideoConfig;

export interface GenerateFlowResult {
  success: boolean;
  error?: string;
  url?: string;
}

// ========================================
// 内部工具函数
// ========================================

/** 构造统一的 projectId */
function buildProjectId(scriptTitle: string): string {
  return `projects/${scriptTitle}`;
}

// ========================================
// 核心入口
// ========================================

/**
 * 统一生图入口 — 一次调用搞定 set-context + generate-assets
 *
 * @example
 * // 角色主图
 * await generateFlow({ kind: 'asset', asset, scriptTitle: '古装仙侠' });
 *
 * // 场景多角度
 * await generateFlow({ kind: 'angle', asset, scriptTitle: '古装仙侠', angleKey: '左45°', angleDesc: 'Left 45-degree angle view' });
 *
 * // 分镜首帧
 * await generateFlow({ kind: 'storyboardFrame', scriptId, scriptTitle: '古装仙侠', shotId, shotIndex: 1, frameType: 'first', prompt: '...', referenceKeywords: ['陆长生'] });
 */
export async function generateFlow(config: GenerateFlowConfig): Promise<GenerateFlowResult> {
  try {
    // ---- Step 1: 构造 generate-assets 参数 ----
    const genBody = buildGenerateBody(config);

    const genRes = await fetch('/api/generate-assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(genBody),
    });

    const genData = await genRes.json();
    if (!genRes.ok || genData.error) {
      throw new Error(genData.error || '调用底层生图引擎失败');
    }

    return {
      success: true,
      url: genData.url,
    };

  } catch (e: any) {
    console.error('[generateFlow] Error:', e);
    return { success: false, error: e.message };
  }
}

// ========================================
// 内部构造函数 — 每种场景的参数映射
// ========================================



function buildGenerateBody(config: GenerateFlowConfig): Record<string, unknown> {
  const projectId = buildProjectId(config.scriptTitle);

  switch (config.kind) {
    case 'asset': {
      const prompt = config.customPrompt || getDefaultAssetPrompt(config.asset, config.artStyle);
      const targetType = config.asset.type === 'character' ? 'characterImage' : 'locationImage';
      const aspectRatio = config.asset.type === 'prop' ? 'IMAGE_ASPECT_RATIO_SQUARE' : 'IMAGE_ASPECT_RATIO_LANDSCAPE';
      return {
        prompt,
        model: 'Nano Banana Pro',
        projectId,
        targetType,
        aspectRatio,
        meta: { fsAssetId: config.asset.id, charName: config.asset.name },
      };
    }

    case 'angle': {
      const styleHint = config.artStyle ? ` Art style: ${config.artStyle}.` : '';
      const prompt = `This same scene, shot from a ${config.angleDesc}. Keep everything identical, only change the camera position.${styleHint}`;
      return {
        prompt,
        model: 'Nano Banana Pro',
        referenceKeyword: config.asset.name,
        projectId,
        targetType: 'locationImage',
        meta: { fsAssetId: config.asset.id, charName: config.asset.name, angleKey: config.angleKey },
      };
    }

    case 'storyboardFrame': {
      return {
        prompt: config.prompt,
        model: 'Nano Banana Pro',
        referenceKeywords: config.referenceKeywords,
        projectId,
        targetType: config.frameType === 'first' ? 'sceneStartImage' : 'sceneImage',
        meta: { shotId: config.shotId, frameType: config.frameType },
      };
    }

    case 'storyboardVideo': {
      return {
        prompt: config.prompt,
        model: 'Veo 3.1',
        referenceKeywords: config.referenceKeywords,
        projectId,
        veoMode: config.referenceKeywords.length > 0 ? 'frame' : 'broll',
        targetType: 'sceneVideo',
        meta: { shotId: config.shotId },
      };
    }
  }
}
