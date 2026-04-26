'use client';

import React from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100">
      <div className="h-12 border-b border-neutral-800/50 flex items-center px-4 gap-3 bg-neutral-950">
        <a href="/" className="text-neutral-500 hover:text-white transition-colors p-1.5 hover:bg-neutral-800 rounded-lg" title="回到首页">
          <ArrowLeft className="w-4 h-4" />
        </a>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-neutral-400">自由创作室</span>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
