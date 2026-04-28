// ========================================
// 全局类型定义 (Viral Shorts Engine)
// ========================================

// ========================================
// 资源目标类型 (TargetType) — 单一真相源
// ========================================
// ⚠️ 新增 targetType 时，必须同步修改以下文件（参见踩坑记录 #2）：
//   1. 本文件 — TARGET_TYPES + TARGET_TYPE_CONFIG
//   2. api/extension/push-asset/route.ts — 文件命名分支
//   3. api/generate-assets/route.ts — 文件命名分支
//   4. lib/ProjectContext.tsx — active-context POST + inbox poller 消费

/** 所有合法的资源目标类型 */
export const TARGET_TYPES = [
  'locationImage',       // 全局场景概念图
  'sceneLocationImage',  // 分镜独立场景概念图
  'characterImage',      // 角色定妆照
  'sceneImage',          // 分镜尾帧图
  'sceneStartImage',     // 分镜首帧图
  'sceneVideo',          // 分镜视频
  'coverImage',          // 海报封面
  // Scene Lab 专用（独立消费端，不走 ProjectContext poller）
  'scenelab_scene',      // Scene Lab 场景参考图
  'scenelab_char',       // Scene Lab 角色参考图
  'scenelab_result',     // Scene Lab 生成结果
] as const;

export type TargetType = typeof TARGET_TYPES[number];

/** 每种资源类型的配置元信息 */
export const TARGET_TYPE_CONFIG: Record<TargetType, {
  /** 存储目录类型 */
  assetDir: 'images' | 'videos' | 'covers';
  /** 文件扩展名（默认，可被 mediaType 覆盖） */
  defaultExt: '.png' | '.mp4';
  /** Chrome 扩展是否需要确认弹窗 */
  requiresConfirm: boolean;
}> = {
  locationImage:      { assetDir: 'images', defaultExt: '.png', requiresConfirm: false },
  sceneLocationImage: { assetDir: 'images', defaultExt: '.png', requiresConfirm: false },
  characterImage:     { assetDir: 'images', defaultExt: '.png', requiresConfirm: false },
  sceneImage:         { assetDir: 'images', defaultExt: '.png', requiresConfirm: true },
  sceneStartImage:    { assetDir: 'images', defaultExt: '.png', requiresConfirm: true },
  sceneVideo:         { assetDir: 'videos', defaultExt: '.mp4', requiresConfirm: true },
  coverImage:         { assetDir: 'covers', defaultExt: '.png', requiresConfirm: false },
  scenelab_scene:     { assetDir: 'images', defaultExt: '.png', requiresConfirm: false },
  scenelab_char:      { assetDir: 'images', defaultExt: '.png', requiresConfirm: false },
  scenelab_result:    { assetDir: 'images', defaultExt: '.png', requiresConfirm: false },
};

/** Inbox 消息条目（Chrome 扩展 → 前端轮询） */
export interface InboxItem {
  url: string;
  mediaType: 'image' | 'video';
  targetType: TargetType;
  index?: number;
  referenceKeyword?: string;
  meta?: Record<string, any>;
  timestamp: number;
}

export interface Character {
  name: string;
  persona: string;
  isProtagonist: boolean;
  voiceName?: string;
  /** 角色性别与声线描述（用于 Veo 3.1 视频口播的语音合成锚定） */
  voice?: string;
}

export interface ScriptLine {
  speaker: string;
  actionHint: string;
  dialogue: string;
}

// ========================================
// Phase 1 新增：灵感素材 & 剧本评审
// ========================================

/** 灵感池中的单条素材 */
export interface InspirationItem {
  id: string;
  source: 'reddit' | 'manual' | 'curated' | 'douyin' | 'other';
  title: string;          // 段子标题/梗概
  content: string;        // 段子正文
  score?: number;         // 热度分 / upvotes
  url?: string;           // 原始链接
  category?: string;      // 分类标签（职场/家庭/动物 等）
  addedAt: string;
}

/** AI 评审打分结果 */
export interface ScriptReview {
  hook: number;           // 黄金三秒 1-10
  twist: number;          // 反转力度 1-10
  pacing: number;         // 节奏紧凑 1-10
  character: number;      // 角色鲜明 1-10
  retention: number;      // 完播预测 1-10
  totalScore: number;     // 总分 (满分50)
  verdict: 'pass' | 'revise';
  feedback: string;       // 修改建议
  iteration: number;      // 当前迭代轮次
}

export interface PublishInfo {
  douyinTitle: string;
  xhsTitle: string;
  bilibiliTitle: string;
  description: string;
  tags: string[];
}

/** 创作模式 */
export type CreativeMode = 'direct' | 'adapt' | 'reference';

/**
 * 完整的项目状态结构
 * 为多项目架构预留 projectId / projectName / createdAt
 */
export interface ProjectState {
  // 项目元信息（多项目预埋）
  projectId: string;
  projectName: string;
  createdAt: string;

  // 全局设置
  artStyle: string;
  flowUrl: string;
  
  // 多平台发布文案
  publishInfo?: PublishInfo;
  
  // 封面生成 (键为比例如 '16:9', '4:3', '3:4')
  coverPrompts: Record<string, string>;
  coverImages: Record<string, string>;

  // Phase 1: 剧本室（三步流水线）
  theme: string;
  characters: Character[];
  scriptLines: ScriptLine[];
  currentPhase: number;
  // v2 新增
  inspirations: InspirationItem[];        // 灵感池
  creativeMode: CreativeMode;             // 创作模式
  rawScript: string;                      // AI 生成的纯文本剧本（评审前）
  scriptReview: ScriptReview | null;      // 评审结果
  scriptIteration: number;                // 当前迭代轮次
  writerStep: number;                     // 剧本室内部步骤 1/2/3

  // Phase 2: 定妆室
  locationPrompt: string;
  locationImage: string;
  characterPrompts: Record<number, string>;
  characterImages: Record<number, string>;

  // Phase 3: 画板区
  activeSceneIndex: number;
  sceneLocationPrompts: Record<number, string>;    // 单幕自定义场景提示词
  sceneLocationImages: Record<number, string>;     // 单幕自定义场景参考图
  sceneImagePrompts: Record<number, string>;       // 中文尾帧图提示词
  sceneVideoPrompts: Record<number, string>;       // 中文视频动态提示词
  sceneStartImagePrompts: Record<number, string>;  // 中文首帧图提示词 (仅第1镜有值)
  sceneCharacters: Record<number, string[]>;
  sceneDurations: Record<number, number>;
  sceneVideoTrimStart: Record<number, number>;
  sceneVideoTrimEnd: Record<number, number>;
  sceneImages: Record<number, string>;             // 尾帧图 URL
  sceneStartImages: Record<number, string>;        // 首帧图 URL (第1镜=生成的, 后续=前一镜尾帧)
  sceneVideos: Record<number, string>;
  sceneAudio: Record<number, string>;
  sceneAudioDelays: Record<number, number>;
}
