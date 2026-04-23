'use client';

import React, { useState, useEffect, useCallback } from 'react';

/* ================================================================
   Constants
   ================================================================ */

const STORAGE_KEY_IMG = 'scenelab_layout_image';
const STORAGE_KEY_OBJ = 'scenelab_objects';

const STYLE_TAGS = ['写实', '3D', '国漫', '广角', '中焦', '特写', '低角度', '电影感'];

/* ================================================================
   Main Workbench Page
   ================================================================ */

export default function SceneLabPage() {
  const [layoutImage, setLayoutImage] = useState<string | null>(null);
  const [layoutLabel, setLayoutLabel] = useState('布局图');
  const [sceneObjects, setSceneObjects] = useState<any[]>([]);

  // Character reference images (keyed by object id)
  const [charImages, setCharImages] = useState<Record<string, string>>({});
  const [sceneImageUrl, setSceneImageUrl] = useState('');
  const [sceneLabel, setSceneLabel] = useState('场景');

  // Prompt composer
  const [styleTag, setStyleTag] = useState('写实');
  const [customText, setCustomText] = useState('');
  const [composedPrompt, setComposedPrompt] = useState('');

  // Generation
  const [flowUrl, setFlowUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Load saved layout from localStorage
  useEffect(() => {
    const img = localStorage.getItem(STORAGE_KEY_IMG);
    if (img) setLayoutImage(img);
    const objStr = localStorage.getItem(STORAGE_KEY_OBJ);
    if (objStr) {
      try { setSceneObjects(JSON.parse(objStr)); } catch { /* ignore */ }
    }
  }, []);

  const characters = sceneObjects.filter((o: any) => o.type === 'character');

  const composePrompt = useCallback(() => {
    const parts: string[] = [];
    const charRefs = characters.map((c: any) => `{@${c.label}}`).join(' 和 ');
    if (charRefs) parts.push(charRefs);
    if (sceneImageUrl && sceneLabel) parts.push(`在 {@${sceneLabel}} 中`);
    if (layoutImage && layoutLabel) {
      const colorMap = characters.map((c: any) => `${c.color}色块位置是${c.label}`).join('，');
      parts.push(`站位以 {@${layoutLabel}} 为参照，${colorMap}`);
    }
    parts.push(`${styleTag}风格`);
    if (customText.trim()) parts.push(customText.trim());
    const result = parts.join('。\n') + '。';
    setComposedPrompt(result);
  }, [characters, sceneLabel, sceneImageUrl, layoutLabel, layoutImage, styleTag, customText]);

  const handleGenerate = useCallback(async () => {
    if (!composedPrompt || !flowUrl) { alert('请填写 Flow URL 和提示词'); return; }
    setGenerating(true);
    try {
      // Only extract keywords that actually appear as {@xx} in the prompt
      const keywordMatches = composedPrompt.matchAll(/\{@([^{}]+)\}/g);
      const keywords = Array.from(keywordMatches, m => m[1]);
      const res = await fetch('/api/generate-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: composedPrompt,
          model: 'Nano Banana Pro',
          referenceKeywords: keywords,
          flowUrl,
          projectId: 'scene-lab-standalone',
          fireAndForget: true,
        }),
      });
      const data = await res.json();
      if (data.success || data.fireAndForget) {
        alert('✅ 已发送到 Flow！请在 Flow 页面等待生成完成，用 Chrome 扩展选图落盘。');
      } else {
        alert('发送失败: ' + (data.error || '未知错误'));
      }
    } catch (e: any) { alert('请求失败: ' + e.message); }
    finally { setGenerating(false); }
  }, [composedPrompt, flowUrl]);

  const handleClearLayout = () => {
    localStorage.removeItem(STORAGE_KEY_IMG);
    localStorage.removeItem(STORAGE_KEY_OBJ);
    setLayoutImage(null);
    setSceneObjects([]);
  };

  const handleAIGenerate = useCallback(async () => {
    setAiGenerating(true);
    try {
      const res = await fetch('/api/scene-lab/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: customText,
          characters: characters.map((c: any) => ({ label: c.label, color: c.color })),
          allObjects: sceneObjects.map((o: any) => ({ type: o.type, label: o.label, color: o.color })),
          hasLayout: !!layoutImage,
          layoutLabel,
          hasScene: !!sceneImageUrl,
          sceneLabel,
          styleTag,
        }),
      });
      const data = await res.json();
      if (data.success && data.prompt) {
        setComposedPrompt(data.prompt);
      } else {
        alert('AI 生成失败: ' + (data.error || '未知错误'));
      }
    } catch (e: any) { alert('请求失败: ' + e.message); }
    finally { setAiGenerating(false); }
  }, [customText, characters, layoutImage, layoutLabel, sceneLabel, styleTag]);

  /* ---- Styles ---- */
  const cardStyle: React.CSSProperties = {
    flex: '0 0 200px', padding: 14, borderRadius: 12, background: '#0f0f1e',
    border: '1px solid #1e1e3a', display: 'flex', flexDirection: 'column', gap: 8,
  };
  const btnStyle = (color: string): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    background: `${color}22`, border: `1px solid ${color}55`, color,
    transition: 'all 0.15s', textAlign: 'center',
  });
  const inputStyle: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 7, fontSize: 12, background: '#12121f',
    border: '1px solid #2a2a4a', color: '#e0e0e0', outline: 'none', width: '100%',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#888', display: 'flex', flexDirection: 'column', gap: 4,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e0e0e0', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e1e3a', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/" style={{ color: '#666', textDecoration: 'none', fontSize: 13 }}>← 返回首页</a>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#a78bfa' }}>📐 定制化绘图工作台</div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ======== Section 1: Material Cards ======== */}
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#c4b5fd', marginBottom: 14 }}>📎 素材卡片</div>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>

            {/* Layout Card */}
            <div style={{ ...cardStyle, borderColor: layoutImage ? '#6366f155' : '#1e1e3a' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>📐 布局参考图</div>
              {layoutImage ? (
                <>
                  <img src={layoutImage} alt="Layout" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, border: '1px solid #2a2a4a' }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a href="/scene-lab/editor" style={{ ...btnStyle('#6366f1'), flex: 1, textDecoration: 'none', display: 'block' }}>✏️ 编辑</a>
                    <button onClick={handleClearLayout} style={{ ...btnStyle('#dc2626'), flex: 1 }}>清除</button>
                  </div>
                </>
              ) : (
                <a href="/scene-lab/editor" style={{ height: 110, background: '#12121f', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#6366f1', textDecoration: 'none', border: '1px dashed #6366f144', cursor: 'pointer', fontWeight: 600 }}>
                  + 点击进入 3D 编辑器
                </a>
              )}
              <label style={labelStyle}>Flow 资产名
                <input value={layoutLabel} onChange={e => setLayoutLabel(e.target.value)} style={inputStyle} />
              </label>
              <div style={{ fontSize: 10, color: '#4a4a6a' }}>引用: <span style={{ color: '#a78bfa' }}>{`{@${layoutLabel}}`}</span></div>
            </div>

            {/* Character Cards */}
            {characters.map((char: any) => (
              <div key={char.id} style={cardStyle}>
                <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: char.color }} />
                  <span style={{ color: char.color }}>{char.label}</span>
                </div>
                {charImages[char.id] ? (
                  <img src={charImages[char.id]} alt={char.label} style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, border: '1px solid #2a2a4a' }} />
                ) : (
                  <div style={{ height: 110, background: '#12121f', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#555' }}>
                    粘贴定妆照 URL 预览
                  </div>
                )}
                <input
                  placeholder="定妆照 URL（仅预览用）"
                  value={charImages[char.id] || ''}
                  onChange={e => setCharImages(prev => ({ ...prev, [char.id]: e.target.value }))}
                  style={inputStyle}
                />
                <div style={{ fontSize: 10, color: '#4a4a6a' }}>引用: <span style={{ color: '#a78bfa' }}>{`{@${char.label}}`}</span></div>
              </div>
            ))}

            {characters.length === 0 && !layoutImage && (
              <div style={{ ...cardStyle, opacity: 0.5, alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 12, color: '#555', textAlign: 'center' }}>先创建布局图<br />角色卡片会自动出现</div>
              </div>
            )}

            {/* Scene Card */}
            <div style={cardStyle}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>🏠 场景参考图</div>
              {sceneImageUrl ? (
                <img src={sceneImageUrl} alt="Scene" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, border: '1px solid #2a2a4a' }} />
              ) : (
                <div style={{ height: 110, background: '#12121f', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#555' }}>
                  粘贴场景图 URL 预览
                </div>
              )}
              <input placeholder="场景参考图 URL" value={sceneImageUrl} onChange={e => setSceneImageUrl(e.target.value)} style={inputStyle} />
              <label style={labelStyle}>Flow 资产名
                <input value={sceneLabel} onChange={e => setSceneLabel(e.target.value)} style={inputStyle} />
              </label>
              <div style={{ fontSize: 10, color: '#4a4a6a' }}>引用: <span style={{ color: '#a78bfa' }}>{`{@${sceneLabel}}`}</span></div>
            </div>
          </div>
        </div>

        {/* ======== Section 2: Prompt Composer ======== */}
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#c4b5fd' }}>✍️ 提示词合成器</div>

            {/* Style tags */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STYLE_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setStyleTag(tag)}
                  style={{
                    padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: styleTag === tag ? '#6366f122' : '#12121f',
                    border: styleTag === tag ? '1px solid #6366f1' : '1px solid #2a2a4a',
                    color: styleTag === tag ? '#a78bfa' : '#666',
                    transition: 'all 0.15s',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Custom description */}
            <input
              placeholder="附加描述（如：面对面对话，背靠背站立，温馨画面…）"
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              style={inputStyle}
            />

            {/* Compose buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={composePrompt} style={{ ...btnStyle('#6366f1'), fontWeight: 700, fontSize: 13, flex: 1 }}>
                🔧 模板合成
              </button>
              <button
                onClick={handleAIGenerate}
                disabled={aiGenerating}
                style={{
                  flex: 1, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: aiGenerating ? 'wait' : 'pointer',
                  background: aiGenerating ? '#1a1a2e' : 'linear-gradient(135deg, #f59e0b33, #f59e0b11)',
                  border: '1px solid #f59e0b55', color: '#f59e0b',
                  opacity: aiGenerating ? 0.6 : 1, transition: 'all 0.15s',
                }}
              >
                {aiGenerating ? '⏳ AI 思考中...' : '🤖 AI 帮写提示词'}
              </button>
            </div>

            {/* Editable prompt */}
            <textarea
              value={composedPrompt}
              onChange={e => setComposedPrompt(e.target.value)}
              placeholder={'点击「自动合成提示词」生成模板\n也可以直接手写，用 {@角色名} 引用 Flow 资产库中的图片'}
              style={{ ...inputStyle, minHeight: 120, resize: 'vertical', fontSize: 13, lineHeight: 1.7 }}
            />

            {/* Flow URL + Actions */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                placeholder="Flow 项目 URL (https://labs.google/fx/zh/tools/flow/...)"
                value={flowUrl}
                onChange={e => setFlowUrl(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { if (composedPrompt) { navigator.clipboard.writeText(composedPrompt); alert('已复制到剪贴板！'); } }}
                style={{ ...btnStyle('#3b82f6'), flex: 1 }}
              >
                📋 复制提示词
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  flex: 2, padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  cursor: generating ? 'wait' : 'pointer',
                  background: generating ? '#333' : 'linear-gradient(135deg, #6366f1, #a855f7)',
                  border: 'none', color: '#fff', opacity: generating ? 0.6 : 1,
                  boxShadow: generating ? 'none' : '0 4px 20px rgba(99,102,241,0.3)',
                }}
              >
                {generating ? '⏳ 生成中...' : '🚀 发送生成'}
              </button>
            </div>
          </div>

          {/* Result preview */}
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#c4b5fd' }}>🖼️ 生成结果</div>
            {generatedImage ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <img src={generatedImage} alt="Generated" style={{ width: '100%', borderRadius: 10, border: '1px solid #2a2a4a' }} />
                <button
                  onClick={() => { const a = document.createElement('a'); a.href = generatedImage!; a.download = `custom-draw-${Date.now()}.png`; a.click(); }}
                  style={btnStyle('#22c55e')}
                >
                  💾 下载图片
                </button>
              </div>
            ) : (
              <div style={{
                flex: 1, minHeight: 200, background: '#0f0f1e', borderRadius: 10,
                border: '1px solid #1e1e3a', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13, color: '#333',
              }}>
                等待生成...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
