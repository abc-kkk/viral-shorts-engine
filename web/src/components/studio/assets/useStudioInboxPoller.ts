import { useEffect } from 'react';
import type { InboxItem } from '@/lib/types';
import { useStudioStore } from '@/lib/studio/store/useStudioStore';

export function useStudioInboxPoller() {
  useEffect(() => {
    const eventSource = new EventSource('/api/sse');

    eventSource.onmessage = (event) => {
      try {
        const item = JSON.parse(event.data) as InboxItem;
        // In Freedom Studio, we use characterImage or locationImage, 
        // and we pass fsAssetId via meta
        if ((item.targetType === 'characterImage' || item.targetType === 'locationImage') && item.meta?.fsAssetId) {
            const fsAssetId = item.meta.fsAssetId;
            const updateAssetThumbnail = useStudioStore.getState().updateAssetThumbnail;
            console.log(`[Studio SSE] Received image for fsAssetId: ${fsAssetId}`);
            updateAssetThumbnail(fsAssetId, item.url);
        }
      } catch (e) {
        console.error('[Studio SSE] Error parsing event data', e);
      }
    };

    eventSource.onerror = (e) => {
      console.log('[Studio SSE] Connection error/reconnecting...', e);
    };

    return () => {
      eventSource.close();
    };
  }, []);
}
