'use client';

import React from 'react';
import { useProject } from '@/lib/ProjectContext';
import LocationPanel from '../LocationPanel';
import { useProjectStore } from '@/lib/store/useProjectStore';

export default function StoryboardLayoutTab() {
  const {
    projectId,
    handleGenerateSceneLocationPrompt, generateSceneLocationImage,
  } = useProject();

  const activeSceneIndex = useProjectStore(s => s.activeSceneIndex);
  const sceneLocationPrompts = useProjectStore(s => s.sceneLocationPrompts);
  const setSceneLocationPrompts = useProjectStore(s => s.setSceneLocationPrompts);
  const sceneLocationImages = useProjectStore(s => s.sceneLocationImages);
  const processingScene = useProjectStore(s => s.processingScene);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
       <LocationPanel
            title="🎯 自定义本幕独立场景 (可选)"
            description="留空则默认使用全局场景"
            prompt={sceneLocationPrompts[activeSceneIndex] || ''}
            onPromptChange={(p) => setSceneLocationPrompts(prev => ({ ...prev, [activeSceneIndex]: p }))}
            image={sceneLocationImages[activeSceneIndex] || ''}
            isProcessingPrompt={processingScene[activeSceneIndex] === 'action'}
            isProcessingImage={processingScene[activeSceneIndex] === 'action'}
            onGeneratePrompt={(hint) => handleGenerateSceneLocationPrompt(activeSceneIndex, hint)}
            onGenerateImage={(keywords) => generateSceneLocationImage(activeSceneIndex, keywords)}
            projectId={projectId}
            isCollapsible={true}
       />
    </div>
  );
}
