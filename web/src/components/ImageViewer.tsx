'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ImageViewerProps {
  imageUrl: string | null;
  onClose: () => void;
}

export default function ImageViewer({ imageUrl, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === '+' || e.key === '=') setScale(s => Math.min(s + 0.25, 5));
    if (e.key === '-') setScale(s => Math.max(s - 0.25, 0.5));
    if (e.key === '0') { setScale(1); setPosition({ x: 0, y: 0 }); }
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(s => Math.min(Math.max(s + delta, 0.5), 5));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setScale(s => Math.min(s + 0.25, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(s => Math.max(s - 0.25, 0.5));
  }, []);

  useEffect(() => {
    if (imageUrl) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousemove', handleMouseMove as any);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.overflow = '';
    };
  }, [imageUrl, handleKeyDown, handleMouseMove, handleMouseUp]);

  if (!imageUrl) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 cursor-zoom-out"
      onClick={handleBackdropClick}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>
      
      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex gap-2 z-10">
        <button
          onClick={zoomOut}
          className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          title="缩小 (-)"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={resetZoom}
          className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          title="重置 (0)"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
        <button
          onClick={zoomIn}
          className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          title="放大 (+)"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
      </div>
      
      {/* Zoom level indicator */}
      <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/50 text-white/80 text-sm z-10">
        {Math.round(scale * 100)}%
      </div>
      
      {/* Image */}
      <div 
        className="relative"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        <img
          src={imageUrl}
          alt="Preview"
          className="max-w-[90vw] max-h-[90vh] object-contain animate-in zoom-in-50 duration-200 rounded-2xl shadow-2xl border border-white/20 select-none"
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/60 text-sm pointer-events-none">
        滚轮缩放 · 拖拽移动 · 点击背景或 ESC 关闭
      </div>
    </div>
  );
}
