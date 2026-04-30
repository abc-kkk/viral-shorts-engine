'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PromptTemplate, PromptVariable } from '@/lib/promptTypes';
import { extractVariables, validateTemplate } from '@/lib/prompts/templateEngine';

interface PromptEditorProps {
  template: PromptTemplate;
  onChange: (updatedTemplate: PromptTemplate) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
}

export default function PromptEditor({ template, onChange, onSave, onReset, isSaving }: PromptEditorProps) {
  const [activeTab, setActiveTab] = useState<'system' | 'user'>('system');
  const systemInputRef = useRef<HTMLTextAreaElement>(null);
  const userInputRef = useRef<HTMLTextAreaElement>(null);

  // Validate missing required variables
  // 排除 auto_inject 类型的变量，因为它们会在运行时自动注入
  const requiredVarKeys = template.variables.filter(v => v.required && v.source !== 'auto_inject').map(v => v.key);
  const missingSystemVars = validateTemplate(template.systemPrompt, requiredVarKeys);
  const missingUserVars = validateTemplate(template.userPrompt, requiredVarKeys);
  const allMissingVars = [...new Set([...missingSystemVars, ...missingUserVars])].filter(
    k => !template.systemPrompt.includes(`{{${k}}}`) && !template.userPrompt.includes(`{{${k}}}`)
  );

  const handleInsertVariable = (variableKey: string) => {
    const textToInsert = `{{${variableKey}}}`;
    const activeRef = activeTab === 'system' ? systemInputRef : userInputRef;
    const currentText = activeTab === 'system' ? template.systemPrompt : template.userPrompt;
    
    if (activeRef.current) {
      const start = activeRef.current.selectionStart;
      const end = activeRef.current.selectionEnd;
      
      const newText = currentText.substring(0, start) + textToInsert + currentText.substring(end);
      
      onChange({
        ...template,
        [activeTab === 'system' ? 'systemPrompt' : 'userPrompt']: newText
      });
      
      // Focus and set cursor position after insertion
      setTimeout(() => {
        if (activeRef.current) {
          activeRef.current.focus();
          activeRef.current.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
        }
      }, 0);
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* Editor Section */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 flex flex-col h-full overflow-hidden">
          <div className="border-b border-neutral-800 px-4 py-3 flex justify-between items-center bg-neutral-900/50">
            <div>
              <h2 className="text-lg font-semibold text-white">{template.name}</h2>
              <p className="text-sm text-neutral-400 mt-1">{template.description}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={onReset}
                className="px-3 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
              >
                恢复默认
              </button>
              <button 
                onClick={onSave}
                disabled={isSaving}
                className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '💾 保存修改'}
              </button>
            </div>
          </div>
          
          <div className="flex border-b border-neutral-800">
            <button 
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'system' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-neutral-400 hover:bg-neutral-800/50'}`}
              onClick={() => setActiveTab('system')}
            >
              System Prompt (系统指令)
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'user' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-neutral-400 hover:bg-neutral-800/50'}`}
              onClick={() => setActiveTab('user')}
            >
              User Prompt (用户输入模板)
            </button>
          </div>

          <div className="flex-1 p-4 relative bg-[#1e1e1e]">
            {activeTab === 'system' ? (
              <textarea
                ref={systemInputRef}
                value={template.systemPrompt}
                onChange={(e) => onChange({ ...template, systemPrompt: e.target.value })}
                className="w-full h-full bg-transparent text-neutral-200 resize-none outline-none font-mono text-[13px] leading-relaxed"
                placeholder="在此输入系统提示词..."
              />
            ) : (
              <textarea
                ref={userInputRef}
                value={template.userPrompt}
                onChange={(e) => onChange({ ...template, userPrompt: e.target.value })}
                className="w-full h-full bg-transparent text-neutral-200 resize-none outline-none font-mono text-[13px] leading-relaxed"
                placeholder="在此输入用户提示词模板..."
              />
            )}
          </div>
        </div>
        
        {allMissingVars.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <h3 className="text-red-400 font-medium flex items-center gap-2">
              ⚠️ 缺少必填变量
            </h3>
            <p className="text-sm text-red-300/80 mt-1">
              以下变量是系统运行必须的，缺失可能导致生图或视频功能异常：
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {allMissingVars.map(v => (
                <span key={v} className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded border border-red-500/30">
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Variables Panel */}
      <div className="w-80 flex flex-col gap-4">
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 flex-1 overflow-hidden flex flex-col">
          <div className="border-b border-neutral-800 px-4 py-3 bg-neutral-900/50">
            <h3 className="font-medium text-white flex items-center gap-2">
              📖 变量参考面板
            </h3>
            <p className="text-xs text-neutral-400 mt-1">点击变量可一键插入到光标位置</p>
          </div>
          
          <div className="p-2 overflow-y-auto flex-1">
            {template.variables.map((v, i) => {
              const isUsed = template.systemPrompt.includes(`{{${v.key}}}`) || template.userPrompt.includes(`{{${v.key}}}`);
              
              return (
                <div 
                  key={v.key} 
                  onClick={() => handleInsertVariable(v.key)}
                  className="mb-2 p-3 rounded-lg border border-neutral-800 bg-neutral-800/30 hover:bg-neutral-800 hover:border-neutral-700 cursor-pointer transition-all group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <code className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                      {`{{${v.key}}}`}
                    </code>
                    {v.required && (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        必须
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-neutral-200 mt-1.5">{v.label}</div>
                  <div className="text-xs text-neutral-500 mt-1 leading-relaxed">{v.description}</div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500">
                      {v.source === 'auto_inject' ? '🤖 系统自动注入' : '👤 用户输入'}
                    </span>
                    <span className={`text-[10px] ${isUsed ? 'text-indigo-400' : 'text-neutral-600'}`}>
                      {isUsed ? '✓ 已使用' : '未引用'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
