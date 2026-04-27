import { useEffect } from 'react';
import type { InboxItem } from '@/lib/types';
import { useStudioStore } from '@/lib/studio/store/useStudioStore';

export function useStudioInboxPoller() {
  useEffect(() => {
    // === 主通道：SSE 实时推送 ===
    const eventSource = new EventSource('/api/sse');

    eventSource.onmessage = (event) => {
      try {
        const item = JSON.parse(event.data) as InboxItem;
        console.log(`[Studio SSE] Received: targetType=${item.targetType}, fsAssetId=${item.meta?.fsAssetId}, angleKey=${item.meta?.angleKey}`);
        if (!item.meta?.fsAssetId) return;

        const fsAssetId = item.meta.fsAssetId;
        const angleKey = item.meta.angleKey as string | undefined;

        if (angleKey) {
          // ========= 多角度图：只更新 data.angles[angleKey] =========
          // 不要调 updateAsset()，它会触发 selectScript() 重载全部资产，导致 modal 关闭
          console.log(`[Studio SSE] Updating angle "${angleKey}" for fsAssetId: ${fsAssetId}`);
          const asset = useStudioStore.getState().currentAssets.find(a => a.id === fsAssetId);
          if (asset) {
            const currentAngles = (asset.data as any).angles || {};
            const newAngles = { ...currentAngles, [angleKey]: item.url };

            // 1. 轻量 PATCH 只更新 data（不触发 selectScript 重载）
            fetch(`/api/studio/assets/${fsAssetId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: { ...(asset.data as any), angles: newAngles } }),
            }).catch(e => console.error('[Studio SSE] PATCH angle failed:', e));

            // 2. 本地 setState 立即渲染（不替换整个 currentAssets 引用）
            useStudioStore.setState((s) => ({
              currentAssets: s.currentAssets.map(a =>
                a.id === fsAssetId
                  ? { ...a, data: { ...(a.data as any), angles: newAngles } }
                  : a
              ),
            }));
          }
        } else {
          // ========= 普通主图 =========
          const updateAssetThumbnail = useStudioStore.getState().updateAssetThumbnail;
          console.log(`[Studio SSE] Updating thumbnail for fsAssetId: ${fsAssetId}`);
          updateAssetThumbnail(fsAssetId, item.url);
        }
      } catch (e) {
        console.error('[Studio SSE] Error parsing event data', e);
      }
    };

    eventSource.onerror = () => {
      console.log('[Studio SSE] Connection error/reconnecting...');
    };

    // === 备用通道：定期轮询 DB ===
    const pollInterval = setInterval(async () => {
      try {
        const state = useStudioStore.getState();
        const scriptId = state.currentScript?.id;
        if (!scriptId) return;

        const res = await fetch(`/api/studio/assets?scriptId=${scriptId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.assets) return;

        const currentAssets = state.currentAssets;
        let hasChanges = false;

        // 逐个对比，只更新有差异的资产（避免整体替换导致 modal 关闭）
        const patchedAssets = currentAssets.map((localAsset: any) => {
          const dbAsset = data.assets.find((a: any) => a.id === localAsset.id);
          if (!dbAsset) return localAsset;

          let changed = false;
          let updated = { ...localAsset };

          // 检查 thumbnail
          if (dbAsset.thumbnail && dbAsset.thumbnail !== localAsset.thumbnail) {
            updated.thumbnail = dbAsset.thumbnail;
            changed = true;
          }

          // 检查 angles
          const dbAngles = dbAsset.data?.angles;
          const localAngles = (localAsset.data as any)?.angles;
          if (dbAngles && JSON.stringify(dbAngles) !== JSON.stringify(localAngles)) {
            updated.data = { ...(localAsset.data as any), angles: dbAngles };
            changed = true;
          }

          if (changed) hasChanges = true;
          return changed ? updated : localAsset;
        });

        if (hasChanges) {
          useStudioStore.setState({ currentAssets: patchedAssets });
        }
      } catch {
        // 静默
      }
    }, 3000);

    return () => {
      eventSource.close();
      clearInterval(pollInterval);
    };
  }, []);
}
