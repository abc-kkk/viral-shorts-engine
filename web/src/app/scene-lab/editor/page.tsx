'use client';

import dynamic from 'next/dynamic';

const SceneLabEditor = dynamic(() => import('@/components/scene-lab/SceneLabEditor'), { ssr: false });

export default function SceneLabEditorPage() {
  return <SceneLabEditor />;
}
