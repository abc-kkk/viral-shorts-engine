'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { onToast } from '@/lib/toast';
import type { ToastEvent } from '@/lib/toast';

const LEVEL_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  success: { bg: 'bg-emerald-950/90', border: 'border-emerald-500/40', icon: '✅' },
  error:   { bg: 'bg-red-950/90',     border: 'border-red-500/40',     icon: '❌' },
  warning: { bg: 'bg-amber-950/90',   border: 'border-amber-500/40',   icon: '⚠️' },
  info:    { bg: 'bg-blue-950/90',    border: 'border-blue-500/40',    icon: 'ℹ️' },
};

const AUTO_DISMISS_MS = 5000;

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);

  useEffect(() => {
    return onToast((event) => {
      setToasts(prev => [...prev.slice(-4), event]); // 最多同时显示 5 条
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== event.id));
      }, AUTO_DISMISS_MS);
    });
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map(t => {
        const style = LEVEL_STYLES[t.level] || LEVEL_STYLES.info;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto ${style.bg} ${style.border} border backdrop-blur-xl rounded-xl px-4 py-3 shadow-2xl flex items-start gap-3 animate-in slide-in-from-right-8 duration-300`}
          >
            <span className="text-base flex-shrink-0 mt-0.5">{style.icon}</span>
            <p className="text-sm text-neutral-200 leading-relaxed flex-1 break-words whitespace-pre-wrap">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-neutral-500 hover:text-neutral-300 text-xs flex-shrink-0 mt-0.5"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
