'use client';

import React, { useState, useEffect, use } from 'react';
import { ProjectProvider, useProject } from '@/lib/ProjectContext';
import SidebarNav from '@/components/SidebarNav';
import WriterRoom from '@/components/WriterRoom';
import CastingRoom from '@/components/CastingRoom';
import StoryboardPanel from '@/components/StoryboardPanel';
import RenderRoom from '@/components/RenderRoom';
import PublishRoom from '@/components/PublishRoom';
import { LayoutPanelLeft } from 'lucide-react';

function StudioContent() {
  const { currentPhase } = useProject();
  const [isCastingDrawerOpen, setIsCastingDrawerOpen] = useState(false);

  // Automatically open casting drawer in phase 2, close in phase 3
  useEffect(() => {
      if (currentPhase === 2) setIsCastingDrawerOpen(true);
      if (currentPhase === 3) setIsCastingDrawerOpen(false);
  }, [currentPhase]);

  return (
    <div className="h-screen bg-neutral-950 text-neutral-100 font-sans flex overflow-hidden">
      <SidebarNav />

      <main className="flex-1 h-full overflow-y-auto p-4 md:p-8 relative">
        <div className="max-w-[1800px] mx-auto flex flex-col gap-8 pb-20">
            {/* PHASE 1: WRITER'S ROOM */}
            {currentPhase === 1 && <WriterRoom />}

            {/* PHASE 2: CASTING ROOM */}
            {currentPhase === 2 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                    <CastingRoom />
                </div>
            )}

            {/* PHASE 3: STORYBOARD PANEL */}
            {currentPhase === 3 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                    <StoryboardPanel />
                </div>
            )}

            {/* PHASE 4: REMOTION RENDER */}
            {currentPhase === 4 && <RenderRoom />}

            {/* PHASE 5: PUBLISH ROOM */}
            {currentPhase === 5 && <PublishRoom />}
        </div>
      </main>
    </div>
  );
}

export default function StudioPage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = use(params);
  const projectId = decodeURIComponent(resolvedParams.projectId);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  if (!isMounted) return null;

  return (
    <ProjectProvider projectId={projectId}>
      <StudioContent />
    </ProjectProvider>
  );
}
