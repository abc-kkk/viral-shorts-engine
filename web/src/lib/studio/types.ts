/**
 * Freedom Studio — 类型定义
 *
 * 本文件定义 Freedom Studio 模块的所有 TypeScript 类型。
 * 与旧系统 lib/types.ts 完全独立，互不影响。
 *
 * 核心原则：剧本先行
 *   - 剧本是起点，资产是剧本的派生
 *   - AI 从剧本中提取角色/场景/道具
 *   - 用户可以修改/补充 AI 提取的资产
 */

// ========================================
// 剧本类型
// ========================================

/** 剧本状态 */
export type FsScriptStatus = 'draft' | 'analyzing' | 'ready' | 'producing';

/** 剧本来源 */
export type FsScriptSource = 'manual' | 'inspiration' | 'ai_generated' | 'imported';

/** 剧本对象（从数据库读取后的完整结构） */
export interface FsScript {
  id: string;
  title: string;
  content: string;
  synopsis: string;
  genre: string;
  episodeCount: number;
  status: FsScriptStatus;
  source: FsScriptSource;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** 创建剧本的输入参数 */
export interface FsScriptCreateInput {
  title: string;
  content?: string;
  synopsis?: string;
  genre?: string;
  episodeCount?: number;
  source?: FsScriptSource;
  metadata?: Record<string, unknown>;
}

/** 更新剧本的输入参数 */
export interface FsScriptUpdateInput {
  title?: string;
  content?: string;
  synopsis?: string;
  genre?: string;
  episodeCount?: number;
  status?: FsScriptStatus;
  source?: FsScriptSource;
  metadata?: Record<string, unknown>;
}

// ========================================
// 资产类型
// ========================================

/** 资产类型枚举 */
export type FsAssetType = 'character' | 'scene' | 'prop';

/** 资产来源 */
export type FsAssetSource = 'ai_extracted' | 'manual' | 'imported';

/** 角色资产 data 字段结构 */
export interface FsCharacterData {
  /** 外观描述（AI提取或用户填写） */
  appearance: string;
  /** 性格特征 */
  personality: string;
  /** 背景故事 */
  background: string;
  /** 角色关系（文字描述，如 "与陆承恩是未婚夫妻，与沈知玉对立"） */
  relationships: string;
  /** 声音配置 */
  voiceConfig?: {
    voiceName?: string;
    voiceId?: string;
    speed?: number;
    pitch?: number;
  };
  /** 参考图URL列表 */
  referenceImages?: string[];
  /** 元数据 */
  metadata?: {
    age?: string;
    gender?: string;
    occupation?: string;
  };
}

/** 场景资产 data 字段结构 */
export interface FsSceneData {
  /** 场景画面描述 */
  imagePrompt: string;
  /** 生成的场景图 URL */
  locationImage?: string;
  /** 氛围描述 */
  atmosphere: string;
  /** 时间设定 */
  timeOfDay?: string;
  /** 天气 */
  weather?: string;
  /** 多角度场景图 { "正面": "url", "左45°": "url", ... } */
  angles?: Record<string, string>;
  /** 默认出现在此场景的角色ID列表 */
  associatedCharacters?: string[];
}

/** 道具资产 data 字段结构 */
export interface FsPropData {
  /** 道具外观描述 */
  imagePrompt: string;
  /** 生成的道具图 URL */
  propImage?: string;
  /** 分类 */
  category: 'weapon' | 'accessory' | 'vehicle' | 'tool' | 'consumable' | 'decoration' | 'other';
  /** 大小描述 */
  sizeDescription?: string;
  /** 通常由哪个角色持有（角色ID） */
  heldBy?: string;
}

/** 资产类型 → data 类型映射 */
export type FsAssetDataMap = {
  character: FsCharacterData;
  scene: FsSceneData;
  prop: FsPropData;
};

/** 通用资产接口（从数据库读取后的完整结构） */
export interface FsAsset<T extends FsAssetType = FsAssetType> {
  id: string;
  scriptId: string;
  type: T;
  name: string;
  description: string;
  tags: string[];
  thumbnail: string | null;
  data: FsAssetDataMap[T];
  source: FsAssetSource;
  createdAt: string;
  updatedAt: string;
}

/** 创建资产的输入参数 */
export interface FsAssetCreateInput<T extends FsAssetType = FsAssetType> {
  scriptId: string;
  type: T;
  name: string;
  description?: string;
  tags?: string[];
  thumbnail?: string;
  source?: FsAssetSource;
  data: Partial<FsAssetDataMap[T]> & Record<string, unknown>;
}

/** 更新资产的输入参数 */
export interface FsAssetUpdateInput {
  name?: string;
  description?: string;
  tags?: string[];
  thumbnail?: string;
  data?: Record<string, unknown>;
}

// ========================================
// AI 分析结果类型
// ========================================

/** AI 从剧本中提取的资产分析结果 */
export interface FsScriptAnalysis {
  characters: Array<{
    name: string;
    appearance: string;
    personality: string;
    background: string;
    relationships: string;
    gender?: string;
    age?: string;
    occupation?: string;
  }>;
  scenes: Array<{
    name: string;
    atmosphere: string;
    imagePrompt: string;
    timeOfDay?: string;
    weather?: string;
  }>;
  props: Array<{
    name: string;
    category: FsPropData['category'];
    imagePrompt: string;
    sizeDescription?: string;
    heldBy?: string;
  }>;
}

// ========================================
// 分镜类型
// ========================================

/** 分镜镜头状态 */
export type FsShotStatus = 'pending' | 'editing' | 'done';

/** 镜头 (Shot) */
export interface FsStoryboardShot {
  id: string;
  visual: string;
  speaker?: string;
  dialogue: string;
  characters: string[];
  props?: string[];
  firstFramePrompt: string;
  lastFramePrompt: string;
  videoPrompt: string;
  firstFrameImage?: string;
  lastFrameImage?: string;
  videoUrl?: string;
  audioUrl?: string;
  status: FsShotStatus;
}

/** 镜头组 (Camera Group / Scene) */
export interface FsStoryboardGroup {
  id: string;
  title: string;
  context: string;
  sceneName: string;
  shots: FsStoryboardShot[];
}

