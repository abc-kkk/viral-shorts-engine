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

  // ---- UI 操作 ----

  setFilterType: (type) => set({ filterType: type }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  openEditor: (assetId) => set({ editingAssetId: assetId, editorOpen: true }),
  closeEditor: () => set({ editingAssetId: null, editorOpen: false }),
  openScriptEditor: () => set({ scriptEditorOpen: true }),
  closeScriptEditor: () => set({ scriptEditorOpen: false }),
  clearError: () => set({ error: null }),
}));
