'use client';

import React, { useState, useEffect } from 'react';
import { PromptTemplate } from '@/lib/promptTypes';
import PromptEditor from '@/components/PromptEditor';

export default function PromptStudioPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/prompt-templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
        if (data.templates.length > 0 && !activeTemplateId) {
          setActiveTemplateId(data.templates[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeTemplate = templates.find(t => t.id === activeTemplateId);

  const handleTemplateChange = (updatedTemplate: PromptTemplate) => {
    setTemplates(prev => prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
  };

  const handleSave = async () => {
    if (!activeTemplate) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/prompt-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: activeTemplate })
      });
      const data = await res.json();
      if (data.success) {
        // Show success toast here if needed
      } else {
        alert("保存失败: " + data.error);
      }
    } catch (err) {
      console.error("Failed to save template:", err);
      alert("保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!activeTemplate) return;
    if (!confirm("确定要将此模板恢复为代码内置的初始状态吗？您所有的自定义修改都将丢失。")) {
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/prompt-templates/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeTemplate.id })
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(prev => prev.map(t => t.id === activeTemplate.id ? data.template : t));
      } else {
        alert("恢复失败: " + data.error);
      }
    } catch (err) {
      console.error("Failed to reset template:", err);
      alert("恢复失败");
    } finally {
      setIsSaving(false);
    }
  };

  const categories = [
    { id: 'writer', name: '▶ 编剧室 (Script)' },
    { id: 'casting', name: '▶ 定妆室 (Casting)' },
    { id: 'storyboard', name: '▶ 分镜室 (Storyboard)' },
    { id: 'publish', name: '▶ 发布中心 (Publish)' },
    { id: 'other', name: '▶ 其他 (Misc)' }
  ];

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center text-white bg-black">加载中...</div>;
  }

  return (
    <div className="h-screen w-full bg-black text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-neutral-800 flex items-center px-6 gap-4 shrink-0 bg-neutral-950">
        <a href="/" className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors shrink-0" title="返回首页">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </a>
        <div className="flex items-center gap-3">
          <div className="text-2xl">🎛️</div>
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              提示词中心
            </h1>
            <p className="text-xs text-neutral-500">AI 提示词可视化管理中心</p>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-neutral-800 bg-neutral-950/50 flex flex-col py-4 overflow-y-auto shrink-0">
          <div className="px-4 mb-2">
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">模板列表</div>
          </div>
          
          {categories.map(cat => {
            const catTemplates = templates.filter(t => t.category === cat.id);
            if (catTemplates.length === 0) return null;
            
            return (
              <div key={cat.id} className="mb-4">
                <div className="px-4 py-2 text-sm font-medium text-neutral-300">
                  {cat.name}
                </div>
                <div>
                  {catTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTemplateId(t.id)}
                      className={`w-full text-left px-6 py-2 text-sm transition-colors ${
                        activeTemplateId === t.id 
                          ? 'bg-indigo-600/20 text-indigo-300 border-r-2 border-indigo-500' 
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 block shrink-0" />
                        <span className="truncate">{t.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-6 bg-black overflow-hidden">
          {activeTemplate ? (
            <PromptEditor 
              template={activeTemplate}
              onChange={handleTemplateChange}
              onSave={handleSave}
              onReset={handleReset}
              isSaving={isSaving}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-500">
              请在左侧选择一个模板开始编辑
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
