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
    const poller = setInterval(async () => {
      try {
        const res = await fetch('/api/extension/inbox');
        if (!res.ok) return;
        const body = await res.json();
        if (body.success && body.data && body.data.length > 0) {
          for (const item of body.data as InboxItem[]) {
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
          }
        }
      } catch(e) {}
    }, 3000);
    return () => clearInterval(poller);
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
