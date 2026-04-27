import { useEffect } from 'react';
import type { InboxItem } from '../types';
import { useProjectStore } from '../store/useProjectStore';
import { globalSseClient } from '../utils/sseClient';

export function useInboxPoller() {
  const useHitlMode = useProjectStore(s => s.useHitlMode);
  
  useEffect(() => {
    if (!useHitlMode) return;
    const handleMessage = (item: InboxItem) => {
      const idx = item.index;
      const {
        setLocationImage, setSceneLocationImages, setCharacterImages,
        setSceneImages, setSceneImageRefs, setSceneStartImages,
        setSceneVideos, setCoverImages
      } = useProjectStore.getState();

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
    };

    globalSseClient.addListener(handleMessage);

    return () => {
      globalSseClient.removeListener(handleMessage);
    };
  }, [useHitlMode]);
}
