/**
 * Freedom Studio — 剧本+资产 Zustand Store
 *
 * 与旧系统 useProjectStore.ts 完全独立，互不影响。
 * 核心流程：剧本先行 → AI 提取资产 → 管理资产
 */
import { create } from 'zustand';
import type {
  FsScript,
  FsScriptCreateInput,
  FsScriptUpdateInput,
  FsAsset,
  FsAssetType,
  FsAssetCreateInput,
  FsAssetUpdateInput,
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

  /** 资产操作 */
  createAsset: (input: FsAssetCreateInput) => Promise<FsAsset | null>;
  updateAsset: (id: string, input: FsAssetUpdateInput) => Promise<FsAsset | null>;
  deleteAsset: (id: string) => Promise<boolean>;

  /** 资产生图流程 */
  requestAssetGeneration: (asset: FsAsset) => Promise<boolean>;
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

export type StudioStore = StudioStoreState & StudioStoreActions;

// ========================================
// Store 实现
// ========================================

export const useStudioStore = create<StudioStore>((set, get) => ({
  // 初始状态
  scripts: [],
  currentScript: null,
  currentAssets: [],
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
      const res = await fetch('/api/studio/scripts');
      if (!res.ok) throw new Error(`加载剧本失败: ${res.statusText}`);
      const data = await res.json();
      set({ scripts: data.scripts || [], loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  createScript: async (input) => {
    set({ error: null });
    try {
      const res = await fetch('/api/studio/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`创建剧本失败: ${res.statusText}`);
      const data = await res.json();
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
      const res = await fetch(`/api/studio/scripts/${id}`);
      if (!res.ok) throw new Error(`加载剧本失败: ${res.statusText}`);
      const data = await res.json();
      set({
        currentScript: data.script,
        currentAssets: data.assets || [],
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  updateScript: async (id, input) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/studio/scripts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`更新剧本失败: ${res.statusText}`);
      const data = await res.json();
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
      const res = await fetch(`/api/studio/scripts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`删除剧本失败: ${res.statusText}`);
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
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `分析剧本失败: ${res.statusText}`);
      }
      const data = await res.json();
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
      const res = await fetch(`/api/studio/scripts/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, prompt, ...options }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `生成剧本失败: ${res.statusText}`);
      }
      const data = await res.json();
      await get().selectScript(id);
      await get().fetchScripts();
      set({ generating: false });
      return data.script;
    } catch (e: any) {
      set({ error: e.message, generating: false });
      return null;
    }
  },

  // ---- 资产操作 ----

  createAsset: async (input) => {
    set({ error: null });
    try {
      const res = await fetch('/api/studio/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`创建资产失败: ${res.statusText}`);
      const data = await res.json();
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
      const res = await fetch(`/api/studio/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`更新资产失败: ${res.statusText}`);
      if (get().currentScript) {
        await get().selectScript(get().currentScript!.id);
      }
      const data = await res.json();
      return data.asset;
    } catch (e: any) {
      set({ error: e.message });
      return null;
    }
  },

  deleteAsset: async (id) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/studio/assets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`删除资产失败: ${res.statusText}`);
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

  requestAssetGeneration: async (asset) => {
    set((state) => ({ generatingAssets: { ...state.generatingAssets, [asset.id]: true }, error: null }));
    try {
      const currentScript = get().currentScript;
      // 1. 设置系统上下文 active-context
      const targetType = asset.type === 'character' ? 'characterImage' : 'locationImage';
      const ctxRes = await fetch(`/api/studio/assets/${asset.id}/set-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: asset.scriptId,
          scriptTitle: currentScript?.title || `Script_${asset.scriptId}`,
          targetType,
          charName: asset.name
        }),
      });
      if (!ctxRes.ok) throw new Error('无法设置扩展生图上下文');

      // 2. 组装 Prompt
      const data = asset.data as any;
      let prompt = ``;
      if (asset.type === 'character') {
         const appearance = data.appearance ? `外貌：${data.appearance}。` : '';
         const personality = data.personality ? `性格/身份：${data.personality}。` : '';
         const desc = asset.description ? `描述：${asset.description}。` : '';
         prompt = `角色【${asset.name}】多角度设定图。${appearance}${personality}${desc}要求如下：
1. 构图：画面左侧必须是一个极大的面部高清特写（占据约三分之一画面），画面右侧为三个全身视图（正面全身、侧面全身、背面全身），整体横向排列在同一张纯白背景图上。
2. 画风：极度写实，手机实拍感，自然光影，包含真实的皮肤纹理和微小瑕疵，拒绝3D渲染或CG塑料感(photorealistic, shot on iPhone, raw photo, ultra-detailed)。
3. 严格禁止：画面中绝不能出现任何文字、字母、图解、箭头或水印(no text, no labels, no words, no annotations)。
4. 一致性：保持人物五官、发型、服装细节在不同角度下100%一致。
5. 表情：设定图必须是绝对的中性无表情（Neutral expression, emotionless, blank stare），请强制忽略描述中可能包含的任何表情词汇（如皱眉、微笑等）。`;
      } else if (asset.type === 'prop') {
         const imgPrompt = data.imagePrompt ? `${data.imagePrompt}. ` : '';
         const size = data.sizeDescription ? `Size reference: ${data.sizeDescription}. ` : '';
         const category = data.category || 'prop';
         const desc = asset.description ? `${asset.description}. ` : '';
         prompt = `Professional product photography turnaround sheet of a ${category}: "${asset.name}". ${imgPrompt}${size}${desc}Requirements:
1. Layout: Show the item from 3 distinct angles arranged on a single image — large hero front view (occupying the left half), plus two smaller views (top-down and side/back) on the right. Clean pure white (#FFFFFF) seamless background.
2. Style: Ultra-realistic commercial product photography, shot with a macro lens (100mm f/2.8), controlled studio strobe lighting with soft diffused fill, subtle contact shadows on the surface. Capture every material texture detail — metal scratches, wood grain, fabric weave, glass refraction, ceramic glaze (8K, RAW, product catalog quality).
3. Mood: Neutral, objective, catalog-style. No dramatic color grading. True-to-life colors under 5500K daylight-balanced studio lights.
4. Strictly forbidden: No text, no labels, no annotations, no watermarks, no human hands, no background elements. The prop must be the sole subject.`;
      } else {
         const atmosphere = data.atmosphere ? `氛围：${data.atmosphere}。` : '';
         const desc = asset.description ? `描述：${asset.description}` : '';
         prompt = `场景【${asset.name}】设计图。${atmosphere}${desc}。空镜头，无人，原生写实主义，极高画质。`;
      }

      // 2.5 Flow URL 已由后端 /api/generate-assets 自动探测（Chrome CDP → 全局设置 → 环境变量）
      const scriptId = asset.scriptId;

      // 3. 触发 Gateway FireAndForget
      const genRes = await fetch('/api/generate-assets', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           prompt,
           model: 'Nano Banana Pro', // 强制图片模型
           projectId: `projects/${currentScript?.title || 'Script_' + asset.scriptId}`, // 存放在 工作空间/projects/xxx 下，与老版完全隔离
           fireAndForget: true,
           targetType, // 透传给网关
           meta: { fsAssetId: asset.id } // 把 ID 带上，保证扩展 push 时能原样带回来
         }),
      });
      
      const genData = await genRes.json();
      if (!genRes.ok || genData.error) {
         throw new Error(genData.error || '调用底层生图引擎失败');
      }

      // 成功触发后，前端 loading 显示 2 秒后自动恢复，让用户可以继续操作（如修改人设再次生成）
      setTimeout(() => {
        set((state) => ({ 
          generatingAssets: { ...state.generatingAssets, [asset.id]: false }
        }));
      }, 2000);

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
      await fetch(`/api/studio/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thumbnail: url }),
      });
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
