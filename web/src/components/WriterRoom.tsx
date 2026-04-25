'use client';

import React from 'react';
import { Search, Sparkles, PlaySquare, Check, ArrowRight } from 'lucide-react';
import { useProjectStore } from '@/lib/store/useProjectStore';
import InspirationLibrary from './writer/InspirationLibrary';
import ScriptEditor from './writer/ScriptEditor';
import SceneSplitter from './writer/SceneSplitter';

export default function WriterRoom() {
  const writerStep = useProjectStore(s => s.writerStep);
  const setWriterStep = useProjectStore(s => s.setWriterStep);

  // ========================================
  // Step 指示器
  // ========================================
  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-8">
      {[
        { step: 1, label: '灵感库', icon: <Search className="w-4 h-4" /> },
        { step: 2, label: 'AI编剧 + 评审', icon: <Sparkles className="w-4 h-4" /> },
        { step: 3, label: '分镜拆解', icon: <PlaySquare className="w-4 h-4" /> },
      ].map(({ step, label, icon }, idx) => (
        <React.Fragment key={step}>
          <button
            onClick={() => setWriterStep(step)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              writerStep === step
                ? 'bg-orange-600/30 text-orange-300 border border-orange-500/50 shadow-lg shadow-orange-500/10'
                : writerStep > step
                ? 'bg-emerald-900/20 text-emerald-500 border border-emerald-500/30'
                : 'bg-neutral-900/50 text-neutral-600 border border-neutral-800/50'
            }`}
          >
            {writerStep > step ? <Check className="w-4 h-4" /> : icon}
            {label}
          </button>
          {idx < 2 && (
            <ArrowRight className={`w-4 h-4 ${writerStep > step ? 'text-emerald-600' : 'text-neutral-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8">
      <StepIndicator />
      {writerStep === 1 && <InspirationLibrary />}
      {writerStep === 2 && <ScriptEditor />}
      {writerStep === 3 && <SceneSplitter />}
    </div>
  );
}
