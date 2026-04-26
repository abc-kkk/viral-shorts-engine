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

  /** AI 分析 */
  analyzeScript: (id: string) => Promise<FsAsset[] | null>;

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

  analyzeScript: async (id) => {
    set({ analyzing: true, error: null });
    try {
      const res = await fetch(`/api/studio/scripts/${id}/analyze`, {
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
         const desc = asset.description ? `描述：${asset.description}` : '';
         prompt = `角色【${asset.name}】设计图。${appearance}${personality}${desc}。原生写实主义，不完美之美，极高画质。`;
      } else {
         const atmosphere = data.atmosphere ? `氛围：${data.atmosphere}。` : '';
         const desc = asset.description ? `描述：${asset.description}` : '';
         prompt = `场景【${asset.name}】设计图。${atmosphere}${desc}。空镜头，无人，原生写实主义，极高画质。`;
      }

      // 2.5 获取当前剧本独立的 Flow URL
      const scriptId = asset.scriptId;
      const currentScript = get().currentScript;
      let flowUrl = currentScript?.metadata?.flowUrl;

      if (!flowUrl) {
          flowUrl = window.prompt('⚠️ 首次生图需要配置此剧本专属的 Google Flow 项目 URL:\n(例如: https://aistudio.google.com/app/flow/...)');
          if (!flowUrl) {
              set((state) => ({ generatingAssets: { ...state.generatingAssets, [asset.id]: false } }));
              return false; // 取消生图
          }
          flowUrl = flowUrl.trim();
          // 保存进剧本的 metadata 中，实现每个项目独立持久化
          await get().updateScript(scriptId, { metadata: { flowUrl } });
      }

      // 3. 触发 Gateway FireAndForget
      const genRes = await fetch('/api/generate-assets', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           prompt,
           model: 'Nano Banana Pro', // 强制图片模型
           projectId: `projects/${currentScript?.title || 'Script_' + asset.scriptId}`, // 存放在 工作空间/projects/xxx 下，与老版完全隔离
           fireAndForget: true,
           flowUrl,
           targetType // 透传给网关
         }),
      });
      
      const genData = await genRes.json();
      if (!genRes.ok || genData.error) {
         throw new Error(genData.error || '调用底层生图引擎失败');
      }

      // 成功触发后，前端 loading 会一直保持 true，直到 inboxPoller 把它消灭。
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
