/**
 * Freedom Studio — 剧本+资产 Zustand Store
 *
 * 与旧系统 useProjectStore.ts 完全独立，互不影响。
 * 核心流程：剧本先行 → AI 提取资产 → 管理资产
 */
import { create } from 'zustand';
import { apiClient } from '@/lib/utils/apiClient';
import type {
  FsScript,
  FsScriptCreateInput,
  FsScriptUpdateInput,
  FsAsset,
  FsAssetType,
  FsAssetCreateInput,
  FsAssetUpdateInput,
  FsStoryboardGroup,
} from '@/lib/studio/types';

// ========================================
// Store 类型
// ========================================

interface StudioStoreState {
  /** 剧本列表 */
  scripts: FsScript[];
  /** 当前选中的剧本 */
  currentScript: FsScript | null;
  /** 当前剧本的资产 */
  currentAssets: FsAsset[];
  /** 分镜组 */
  storyboardGroups: FsStoryboardGroup[];
  /** 加载状态 */
  loading: boolean;
  analyzing: boolean;
  /** AI 生成/润色剧本中 */
  generating: boolean;
  error: string | null;
  /** 资产筛选 */
  filterType: FsAssetType | 'all';
  searchQuery: string;
  /** 弹窗状态 */
  editorOpen: boolean;
  editingAssetId: string | null;
  scriptEditorOpen: boolean;
  /** 正在生图中的资产记录 */
  generatingAssets: Record<string, boolean>;
}

interface StudioStoreActions {
  /** 剧本操作 */
  fetchScripts: () => Promise<void>;
  createScript: (input: FsScriptCreateInput) => Promise<FsScript | null>;
  selectScript: (id: string) => Promise<void>;
  updateScript: (id: string, input: FsScriptUpdateInput) => Promise<FsScript | null>;
  deleteScript: (id: string) => Promise<boolean>;

  /** AI 分析（可选 category 指定只提取某一类） */
  analyzeScript: (id: string, category?: 'character' | 'scene' | 'prop') => Promise<FsAsset[] | null>;

  /** AI 生成/润色剧本 */
  generateScript: (id: string, mode: 'generate' | 'polish', prompt: string, options?: { genre?: string; episodeCount?: number }) => Promise<FsScript | null>;

  /** 提取分镜 */
  extractStoryboard: (id: string) => Promise<boolean>;

  /** 更新单个分镜镜头（保存提示词或生成的图片） */
  updateStoryboardShot: (shotId: string, updates: Record<string, unknown>) => Promise<boolean>;

  /** 资产操作 */
  createAsset: (input: FsAssetCreateInput) => Promise<FsAsset | null>;
  updateAsset: (id: string, input: FsAssetUpdateInput) => Promise<FsAsset | null>;
  deleteAsset: (id: string) => Promise<boolean>;

  /** 资产生图流程 */
  requestAssetGeneration: (asset: FsAsset, customPrompt?: string) => Promise<boolean>;
  updateAssetThumbnail: (id: string, url: string) => Promise<boolean>;

  /** UI 操作 */
  setFilterType: (type: FsAssetType | 'all') => void;
  setSearchQuery: (query: string) => void;
  openEditor: (assetId: string) => void;
  closeEditor: () => void;
  openScriptEditor: () => void;
  closeScriptEditor: () => void;
  clearError: () => void;
}

export function getDefaultAssetPrompt(asset: FsAsset, artStyle?: string): string {
  const data = asset.data as any;
  const styleInstruction = artStyle ? artStyle : "极度写实，手机实拍感，自然光影，包含真实的皮肤纹理和微小瑕疵，拒绝3D渲染或CG塑料感(photorealistic, shot on iPhone, raw photo, ultra-detailed)";
  let prompt = ``;
  if (asset.type === 'character') {
     const appearance = data.appearance ? `外貌：${data.appearance}。` : '';
     const personality = data.personality ? `性格/身份：${data.personality}。` : '';
     const desc = asset.description ? `描述：${asset.description}。` : '';
     prompt = `专业角色设定表(Character Design Sheet) - 目标角色：【${asset.name}】
角色特征：${appearance} ${personality} ${desc}

请严格按以下要求生成设定图：
- 绝对静态视角：纯白色背景，无环境无阴影。正面正视图，面朝镜头，身体正对前方。严禁侧身，禁止任何动态姿势。
- 强制体态与空手：身姿挺拔，双肩平直，正视前方。双手必须自然垂放于身体两侧，空空如也，绝对不能拿任何武器或道具 (empty hands, arms down, holding nothing)。【极其重要：即使上方“角色特征”中提到了武器、剑、刀等道具，也请强制忽略，绝对不能画出任何道具！】
- 画幅构图：横向 16:9，专业角色设定表排版，纯白色极简背景，无多余元素。
- 视觉风格：严格遵循以下风格定调：${styleInstruction}。
- 左侧特写：画面左侧占据三分之一，必须是角色面部高清特写。肤质光影符合上述风格，展示确切的年龄与性别特征。
- 右侧三视图：画面右侧占据三分之二，必须是角色标准全身三视图（正面全身、侧面全身、背面全身）。【极其重要】：全身视图的光影、质感、渲染/摄影画风必须与左侧特写保持100%绝对一致，严禁左右两侧画风割裂（如左边写实、右边变成草图线稿）。
- 服装与细节：除非描述中明确要求衣服破损，否则必须完整无破损。
- 一致性原则：保持五官、发型、服装细节在左侧特写和右侧三视图中100%一致。
- 绝对中立表情：必须是绝对的中性无表情（Neutral expression, emotionless, blank stare），强制屏蔽特征中的情绪词（如微笑、愤怒）。
- 画面纯净度：画面中绝不能出现任何文字、字母、图解、箭头或水印(no text, no labels, no annotations)。
- 负向提示词(Negative Prompts)：text, watermark, sketch, unfinished, ugly.`;
  } else if (asset.type === 'prop') {
     const imgPrompt = data.imagePrompt ? `${data.imagePrompt}。` : '';
     const size = data.sizeDescription ? `尺寸参考：${data.sizeDescription}。` : '';
     const desc = asset.description ? `${asset.description}。` : '';
     prompt = `道具【${asset.name}】单张产品摄影图。${imgPrompt}${size}${desc}
要求：
1. 构图：单一正面视角，干净的纯白背景，道具居中占满画面。
2. 画风：${styleInstruction}。并且需要保持产品级别的打光，清晰展示材质纹理细节，8K超高清。
3. 严格禁止：画面中绝不能出现任何文字、标签、水印、人手或多余背景元素(no text, no labels, no annotations, no watermarks, single image only)。`;
  } else {
     const atmosphere = data.atmosphere ? `氛围：${data.atmosphere}。` : '';
     const imgPrompt = data.imagePrompt ? `画面描述：${data.imagePrompt}。` : '';
     const desc = asset.description ? `描述：${asset.description}。` : '';
     prompt = `不能出现其他人，无人，纯场景，无打斗无破坏无废墟，电影级纯净空镜头场景【${asset.name}】。${atmosphere}${imgPrompt}${desc}
要求：
1. 绝对真空：纯粹的场景背景图，画面中严禁出现任何人影、动物或角色。
2. 绝对纯净与完好：场景必须呈现整洁、完好、无破坏的状态。严禁出现打斗痕迹、废墟、血迹、碎片、爆炸、烟雾、混乱动态等元素(intact, no damage, no battle, no debris)。
3. 画风：${styleInstruction}。请展现极具电影感的布光与画面质感（Cinematic lighting, 8K resolution）。
4. 画面纯净度：必须是一张完整的单幅画面；绝不能出现任何文字、标签、边框或UI元素(no text, no labels, no concept art sheet, single image only)。`;
  }
  return prompt;
}

export type StudioStore = StudioStoreState & StudioStoreActions;

// ========================================
// Store 实现
// ========================================

export const useStudioStore = create<StudioStore>((set, get) => ({
  // 初始状态
  scripts: [],
  currentScript: null,
  currentAssets: [],
  storyboardGroups: [],
  loading: false,
  analyzing: false,
  generating: false,
  error: null,
  filterType: 'all',
  searchQuery: '',
  editorOpen: false,
  editingAssetId: null,
  scriptEditorOpen: false,
  generatingAssets: {},

  // ---- 剧本操作 ----

  fetchScripts: async () => {
    set({ loading: true, error: null });
    try {
      const data = await apiClient.get('/api/studio/scripts', { hideErrorToast: true });
      set({ scripts: data.scripts || [], loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  createScript: async (input) => {
    set({ error: null });
    try {
      const data = await apiClient.post('/api/studio/scripts', input, { hideErrorToast: true });
      await get().fetchScripts();
      return data.script;
    } catch (e: any) {
      set({ error: e.message });
      return null;
    }
  },

  selectScript: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await apiClient.get(`/api/studio/scripts/${id}`, { hideErrorToast: true });
      const script = data.script;
      // 从 metadata 中恢复分镜数据
      const savedGroups = script?.metadata?.storyboardGroups || [];
      set({
        currentScript: script,
        currentAssets: data.assets || [],
        storyboardGroups: savedGroups,
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  updateScript: async (id, input) => {
    set({ error: null });
    try {
      const data = await apiClient.patch(`/api/studio/scripts/${id}`, input, { hideErrorToast: true });
      if (get().currentScript?.id === id) {
        set({ currentScript: data.script });
      }
      await get().fetchScripts();
      return data.script;
    } catch (e: any) {
      set({ error: e.message });
      return null;
    }
  },

  deleteScript: async (id) => {
    set({ error: null });
    try {
      await apiClient.delete(`/api/studio/scripts/${id}`, { hideErrorToast: true });
      if (get().currentScript?.id === id) {
        set({ currentScript: null, currentAssets: [] });
      }
      await get().fetchScripts();
      return true;
    } catch (e: any) {
      set({ error: e.message });
      return false;
    }
  },

  // ---- AI 分析 ----

  analyzeScript: async (id, category) => {
    set({ analyzing: true, error: null });
    try {
      const url = category
        ? `/api/studio/scripts/${id}/analyze?category=${category}`
        : `/api/studio/scripts/${id}/analyze`;
      const data = await apiClient.post(url, undefined, { hideErrorToast: true });
      await get().selectScript(id);
      set({ analyzing: false });
      return data.created;
    } catch (e: any) {
      set({ error: e.message, analyzing: false });
      return null;
    }
  },

  generateScript: async (id, mode, prompt, options) => {
    set({ generating: true, error: null });
    try {
      const data = await apiClient.post(`/api/studio/scripts/${id}/generate`, { mode, prompt, ...options }, { hideErrorToast: true });
      await get().selectScript(id);
      await get().fetchScripts();
      set({ generating: false });
      return data.script;
    } catch (e: any) {
      set({ error: e.message, generating: false });
      return null;
    }
  },

  extractStoryboard: async (id) => {
    set({ analyzing: true, error: null });
    try {
      const data = await apiClient.post(`/api/studio/scripts/${id}/extract-storyboard`, undefined, { hideErrorToast: true });
      set({ storyboardGroups: data.groups || [], analyzing: false });
      return true;
    } catch (e: any) {
      set({ error: e.message, analyzing: false });
      return false;
    }
  },

  updateStoryboardShot: async (shotId, updates) => {
    const { currentScript, storyboardGroups, updateScript } = get();
    if (!currentScript) return false;

    let found = false;
    const newGroups = storyboardGroups.map(group => {
      const newShots = group.shots.map(shot => {
        if (shot.id === shotId) {
          found = true;
          return { ...shot, ...updates };
        }
        return shot;
      });
      return { ...group, shots: newShots };
    });

    if (!found) return false;

    // 更新本地状态
    set({ storyboardGroups: newGroups });

    // 同步到数据库
    const metadata = { ...(currentScript.metadata as object || {}), storyboardGroups: newGroups };
    await updateScript(currentScript.id, { metadata });
    return true;
  },

  // ---- 资产操作 ----

  createAsset: async (input) => {
    set({ error: null });
    try {
      const data = await apiClient.post('/api/studio/assets', input, { hideErrorToast: true });
      if (get().currentScript) {
        await get().selectScript(get().currentScript!.id);
      }
      return data.asset;
    } catch (e: any) {
      set({ error: e.message });
      return null;
    }
  },

  updateAsset: async (id, input) => {
    set({ error: null });
    try {
      const data = await apiClient.patch(`/api/studio/assets/${id}`, input, { hideErrorToast: true });
      if (get().currentScript) {
        await get().selectScript(get().currentScript!.id);
      }
      return data.asset;
    } catch (e: any) {
      set({ error: e.message });
      return null;
    }
  },

  deleteAsset: async (id) => {
    set({ error: null });
    try {
      await apiClient.delete(`/api/studio/assets/${id}`, { hideErrorToast: true });
      if (get().currentScript) {
        await get().selectScript(get().currentScript!.id);
      }
      return true;
    } catch (e: any) {
      set({ error: e.message });
      return false;
    }
  },

  // ---- 资产生图流程 ----

  requestAssetGeneration: async (asset, customPrompt?: string) => {
    set((state) => ({ generatingAssets: { ...state.generatingAssets, [asset.id]: true }, error: null }));
    try {
      const currentScript = get().currentScript;
      const { generateFlow } = await import('@/lib/studio/generateFlow');

      const artStyle = (currentScript?.metadata as any)?.artStyle as string | undefined;
      const result = await generateFlow({
        kind: 'asset',
        asset,
        scriptTitle: currentScript?.title || `Script_${asset.scriptId}`,
        customPrompt,
        artStyle,
      });

      if (!result.success) throw new Error(result.error || '生图失败');

      // 新 API 同步返回 URL，立即更新缩略图
      if (result.url) {
        get().updateAsset(asset.id, { thumbnail: result.url });
      }

      set((state) => ({ 
        generatingAssets: { ...state.generatingAssets, [asset.id]: false }
      }));

      return true;
    } catch (e: any) {
      set((state) => ({ 
         generatingAssets: { ...state.generatingAssets, [asset.id]: false },
         error: e.message 
      }));
      return false;
    }
  },

  updateAssetThumbnail: async (id, url) => {
    // 这个方法通常由 Poller 调用
    try {
      // 本地乐观更新 UI 和关闭 loading
      set((state) => ({
         currentAssets: state.currentAssets.map(a => a.id === id ? { ...a, thumbnail: url } : a),
         generatingAssets: { ...state.generatingAssets, [id]: false }
      }));
      
      // 更新服务端 DB
      await apiClient.patch(`/api/studio/assets/${id}`, { thumbnail: url }, { hideErrorToast: true });
      return true;
    } catch (e) {
      console.error('更新缩略图失败', e);
      return false;
    }
  },

  // ---- UI 操作 ----

  setFilterType: (type) => set({ filterType: type }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  openEditor: (assetId) => set({ editingAssetId: assetId, editorOpen: true }),
  closeEditor: () => set({ editingAssetId: null, editorOpen: false }),
  openScriptEditor: () => set({ scriptEditorOpen: true }),
  closeScriptEditor: () => set({ scriptEditorOpen: false }),
  clearError: () => set({ error: null }),
}));
