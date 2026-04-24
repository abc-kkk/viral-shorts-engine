import { useEffect } from 'react';
import type { InboxItem } from '../types';

export function useInboxPoller(state: any) {
  const {
    useHitlMode,
    setLocationImage,
    setSceneLocationImages,
    setCharacterImages,
    setSceneImages,
    setSceneImageRefs,
    setSceneStartImages,
    setSceneVideos,
    setCoverImages
  } = state;

  useEffect(() => {
    if (!useHitlMode) return;
    const eventSource = new EventSource('/api/sse');

    eventSource.onmessage = (event) => {
      try {
        const item = JSON.parse(event.data) as InboxItem;
        const idx = item.index;
        if (item.targetType === 'locationImage') {
          setLocationImage(item.url);
        } else if (item.targetType === 'sceneLocationImage' && idx !== undefined) {
          setSceneLocationImages((prev: any) => ({ ...prev, [idx]: item.url }));
        } else if (item.targetType === 'characterImage' && idx !== undefined) {
          setCharacterImages((prev: any) => ({ ...prev, [idx]: item.url }));
        } else if (item.targetType === 'sceneImage' && idx !== undefined) {
          setSceneImages((prev: any) => ({ ...prev, [idx]: item.url }));
          if (item.referenceKeyword) {
            setSceneImageRefs((prev: any) => ({ ...prev, [idx]: item.referenceKeyword! }));
          }
        } else if (item.targetType === 'sceneStartImage' && idx !== undefined) {
          setSceneStartImages((prev: any) => ({ ...prev, [idx]: item.url }));
          if (item.referenceKeyword) {
            setSceneImageRefs((prev: any) => ({ ...prev, [`start_${idx}`]: item.referenceKeyword! }));
          }
        } else if (item.targetType === 'sceneVideo' && idx !== undefined) {
          setSceneVideos((prev: any) => ({ ...prev, [idx]: item.url }));
        } else if (item.targetType === 'coverImage' && item.meta?.ratio) {
          setCoverImages((prev: any) => ({ ...prev, [item.meta!.ratio]: item.url }));
        }
      } catch (e) {
        console.error('[SSE] Error parsing event data', e);
      }
    };

    eventSource.onerror = (e) => {
      // It will auto-reconnect, but we can log it
      console.log('[SSE] Connection error/reconnecting...', e);
    };

    return () => {
      eventSource.close();
    };
  }, [
    useHitlMode,
    setLocationImage,
    setSceneLocationImages,
    setCharacterImages,
    setSceneImages,
    setSceneImageRefs,
    setSceneStartImages,
    setSceneVideos,
    setCoverImages
  ]);
}
