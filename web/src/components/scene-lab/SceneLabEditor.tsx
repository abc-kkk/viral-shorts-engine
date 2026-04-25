'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { toast } from '@/lib/toast';

import { SceneObject, CameraPreset } from './types';
import { 
  CAMERA_PRESETS, CHARACTER_COLORS, FURNITURE_COLOR, 
  COLOR_PALETTE, FURNITURE_LABELS,
  STORAGE_KEY_IMG, STORAGE_KEY_OBJ
} from './constants';
import { ObjectMesh } from './SceneObjects';

/* ================================================================
   Camera animator – smooth preset transitions
   ================================================================ */

function CameraAnimator({
  preset,
  controlsRef,
}: {
  preset: CameraPreset | null;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const animating = useRef(false);

  React.useEffect(() => {
    if (!preset) return;
    targetPos.current.set(...preset.position);
    targetLook.current.set(...preset.target);
    animating.current = true;
  }, [preset]);

  useFrame(() => {
    if (!animating.current || !controlsRef.current) return;
    camera.position.lerp(targetPos.current, 0.08);
    controlsRef.current.target.lerp(targetLook.current, 0.08);
    controlsRef.current.update();
    if (camera.position.distanceTo(targetPos.current) < 0.05) {
      animating.current = false;
    }
  });

  return null;
}

/* ================================================================
   Screenshot helper – stores refs for external capture trigger
   ================================================================ */

function ScreenshotHelper({ screenshotRef }: { screenshotRef: React.MutableRefObject<{ gl: any; scene: any; camera: any } | null> }) {
  const { gl, scene, camera } = useThree();
  // Store refs once, no re-render loops
  screenshotRef.current = { gl, scene, camera };
  return null;
}

/* ================================================================
   3D Scene
   ================================================================ */

function Scene({
  objects,
  selectedId,
  onSelect,
  onObjectMove,
  cameraPreset,
  screenshotRef,
}: {
  objects: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onObjectMove: (id: string, pos: [number, number, number]) => void;
  cameraPreset: CameraPreset | null;
  screenshotRef: React.MutableRefObject<{ gl: any; scene: any; camera: any } | null>;
}) {
  const controlsRef = useRef<any>(null);
  const draggingRef = useRef<string | null>(null);
  const offsetRef = useRef(new THREE.Vector3());

  const handleStartDrag = useCallback(
    (id: string, hitPoint: THREE.Vector3) => {
      const obj = objects.find((o) => o.id === id);
      if (!obj) return;
      draggingRef.current = id;
      offsetRef.current.set(hitPoint.x - obj.position[0], 0, hitPoint.z - obj.position[2]);
      if (controlsRef.current) controlsRef.current.enabled = false;
    },
    [objects]
  );

  return (
    <>
      <color attach="background" args={['#0d0d1a']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 3]} intensity={0.9} castShadow />
      <directionalLight position={[-3, 4, -2]} intensity={0.3} />

      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#2a2a3e"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#3a3a5e"
        fadeDistance={25}
        position={[0, 0, 0]}
      />

      {/* Ground / drag plane – barely visible so raycasting works */}
      <mesh
        rotation-x={-Math.PI / 2}
        position-y={-0.01}
        receiveShadow
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          e.stopPropagation();
          const newX = e.point.x - offsetRef.current.x;
          const newZ = e.point.z - offsetRef.current.z;
          onObjectMove(draggingRef.current, [newX, 0, newZ]);
        }}
        onPointerUp={() => {
          draggingRef.current = null;
          if (controlsRef.current) controlsRef.current.enabled = true;
        }}
      >
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#0d0d1a" roughness={1} side={THREE.DoubleSide} />
      </mesh>

      {/* Scene objects */}
      {objects.map((obj) => (
        <group
          key={obj.id}
          position={obj.position}
          rotation={[0, obj.rotationY, 0]}
          scale={[obj.scaleX, 1, obj.scaleZ]}
          onPointerDown={(e) => {
            e.stopPropagation();
            onSelect(obj.id);
            handleStartDrag(obj.id, e.point);
          }}
        >
          <ObjectMesh obj={obj} selected={selectedId === obj.id} />
        </group>
      ))}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.1}
        maxPolarAngle={Math.PI * 0.48}
      />
      <CameraAnimator preset={cameraPreset} controlsRef={controlsRef} />
      <ScreenshotHelper screenshotRef={screenshotRef} />
    </>
  );
}

/* ================================================================
   Main Editor Component (exported) – Full-page 3D layout editor
   Saves screenshot + objects to localStorage, then navigates back
   ================================================================ */

let _idCounter = 0;
function newId() { return `obj_${Date.now()}_${++_idCounter}`; }

export { STORAGE_KEY_IMG, STORAGE_KEY_OBJ } from './constants';

function getDefaultObjects(): SceneObject[] {
  return [
    { id: 'char_1', type: 'character', position: [-1, 0, 0], rotationY: 0, color: CHARACTER_COLORS[0], label: '男主', scaleX: 1, scaleZ: 1 },
    { id: 'char_2', type: 'character', position: [1, 0, 0], rotationY: 0, color: CHARACTER_COLORS[1], label: '女主', scaleX: 1, scaleZ: 1 },
  ];
}

interface SceneLabEditorProps {
  /** 保存后返回的 URL，默认 /scene-lab */
  returnUrl?: string;
  /** 初始加载的预设 ID（编辑模式） */
  initialPresetId?: string;
  /** 初始加载的物体列表（从预设传入） */
  initialObjects?: SceneObject[];
}

export default function SceneLabEditor({ returnUrl, initialPresetId, initialObjects }: SceneLabEditorProps = {}) {
  const [objects, setObjects] = useState<SceneObject[]>(() => {
    if (initialObjects && initialObjects.length > 0) return initialObjects;
    if (typeof window === 'undefined') return getDefaultObjects();
    try { const s = localStorage.getItem(STORAGE_KEY_OBJ); return s ? JSON.parse(s) : getDefaultObjects(); }
    catch { return getDefaultObjects(); }
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCameraPreset, setActiveCameraPreset] = useState<CameraPreset | null>(null);
  const screenshotRef = useRef<{ gl: any; scene: any; camera: any } | null>(null);
  const selectedObj = objects.find((o) => o.id === selectedId) ?? null;
  const [presetName, setPresetName] = useState('');
  const [saving, setSaving] = useState(false);

  // 读取 URL 参数
  const [effectiveReturnUrl, setEffectiveReturnUrl] = useState(returnUrl || '/scene-lab');
  const [effectivePresetId, setEffectivePresetId] = useState(initialPresetId || '');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const ru = params.get('returnUrl');
    const pid = params.get('presetId');
    if (ru) setEffectiveReturnUrl(ru);
    if (pid) {
      setEffectivePresetId(pid);
      // 加载已有预设
      fetch(`/api/layouts`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.presets) {
            const preset = data.presets.find((p: any) => p.id === pid);
            if (preset) {
              setObjects(preset.objects);
              setPresetName(preset.name);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  const addObject = useCallback((type: SceneObject['type']) => {
    const colorIdx = objects.filter((o) => o.type === 'character').length;
    const obj: SceneObject = {
      id: newId(), type, position: [0, 0, 0], rotationY: 0,
      color: type === 'character' ? CHARACTER_COLORS[colorIdx % CHARACTER_COLORS.length] : FURNITURE_COLOR,
      label: type === 'character' ? `角色${colorIdx + 1}` : (FURNITURE_LABELS[type] || type),
      scaleX: 1, scaleZ: 1,
    };
    setObjects((prev) => [...prev, obj]);
    setSelectedId(obj.id);
  }, [objects]);

  const deleteSelected = useCallback(() => { if (!selectedId) return; setObjects((prev) => prev.filter((o) => o.id !== selectedId)); setSelectedId(null); }, [selectedId]);
  const moveObject = useCallback((id: string, pos: [number, number, number]) => { setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, position: pos } : o))); }, []);
  const updateSelected = useCallback((patch: Partial<SceneObject>) => { if (!selectedId) return; setObjects((prev) => prev.map((o) => (o.id === selectedId ? { ...o, ...patch } : o))); }, [selectedId]);

  const handleSaveAndReturn = useCallback(async () => {
    const ctx = screenshotRef.current;
    if (!ctx) { toast.error('截图失败，请重试'); return; }
    
    const name = presetName.trim() || `布局_${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
    
    setSaving(true);
    try {
      ctx.gl.render(ctx.scene, ctx.camera);
      const src = ctx.gl.domElement;
      
      // 强制裁剪成 16:9，防止 Flow 因为垫图比例不对而生出方图
      const targetAspect = 16 / 9;
      const srcAspect = src.width / src.height;
      
      let sx = 0, sy = 0, sWidth = src.width, sHeight = src.height;
      
      if (srcAspect > targetAspect) {
          // 原图比 16:9 宽，裁掉两边
          sWidth = src.height * targetAspect;
          sx = (src.width - sWidth) / 2;
      } else {
          // 原图比 16:9 高，裁掉上下
          sHeight = src.width / targetAspect;
          sy = (src.height - sHeight) / 2;
      }
      
      const targetW = 1280;
      const targetH = 720;
      
      const off = document.createElement('canvas');
      off.width = targetW;
      off.height = targetH;
      off.getContext('2d')!.drawImage(src, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
      const imageData = off.toDataURL('image/png');

      // 同时保存到 localStorage（Scene Lab 页面兼容）
      localStorage.setItem(STORAGE_KEY_IMG, imageData);
      localStorage.setItem(STORAGE_KEY_OBJ, JSON.stringify(objects));

      // 保存到 API（持久化到项目文件夹）
      const res = await fetch('/api/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: effectivePresetId || undefined,
          name,
          objects,
          image: imageData,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error('保存失败: ' + (data.error || '未知错误'));
        return;
      }

      // 将新保存的预设 ID 传回
      const savedId = data.preset?.id || '';
      const target = new URL(effectiveReturnUrl, window.location.origin);
      if (savedId) target.searchParams.set('layoutPresetId', savedId);
      window.location.href = target.toString();
    } catch (e: any) {
      toast.error('保存失败: ' + e.message);
    } finally {
      setSaving(false);
    }
  }, [objects, presetName, effectivePresetId, effectiveReturnUrl]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', background: '#0a0a14', color: '#e0e0e0', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      {/* Left Sidebar */}
      <div style={{ width: 210, borderRight: '1px solid #1e1e3a', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#a78bfa' }}>🎬 布景编辑器</div>
        <div style={{ fontSize: 10, color: '#555', lineHeight: 1.4 }}>拖拽色块摆放站位，切换视角，完成后保存返回</div>
        <button onClick={() => addObject('character')} style={btnStyle('#22c55e')}>＋ 添加角色</button>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#666', marginTop: 4 }}>家具道具</div>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {(['sofa','table','chair','bed','bookshelf','tv','lamp','cabinet','counter','partition','rug'] as const).map(t => (
            <button key={t} onClick={() => addObject(t)} style={{ ...btnStyle('#8B4513'), fontSize: 10, padding: '4px 7px' }}>{FURNITURE_LABELS[t]}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginTop: 6 }}>场景物体</div>
        {objects.map((obj) => (
          <div key={obj.id} onClick={() => setSelectedId(obj.id)} style={{ padding: '5px 7px', borderRadius: 6, fontSize: 11, cursor: 'pointer', background: selectedId === obj.id ? '#2a2a5a' : '#12121f', border: selectedId === obj.id ? '1px solid #6366f1' : '1px solid #1e1e3a', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: obj.color, flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{obj.label}</span>
          </div>
        ))}
      </div>

      {/* 3D Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas shadows camera={{ position: [0, 3, 6], fov: 50 }} gl={{ preserveDrawingBuffer: true, antialias: true }} onPointerMissed={() => setSelectedId(null)}>
          <Scene objects={objects} selectedId={selectedId} onSelect={setSelectedId} onObjectMove={moveObject} cameraPreset={activeCameraPreset} screenshotRef={screenshotRef} />
        </Canvas>
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexWrap: 'wrap', gap: 5, maxWidth: 280 }}>
          {CAMERA_PRESETS.map((p) => (
            <button key={p.name} onClick={() => setActiveCameraPreset({ ...p })} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#1a1a2e', border: '1px solid #2a2a4a', color: '#c4b5fd' }}>{p.name}</button>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10 }}>
          <button onClick={() => { window.location.href = effectiveReturnUrl; }} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#1e1e3a', border: '1px solid #2a2a4a', color: '#999' }}>取消返回</button>
          <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="输入布局名称…" style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, background: '#12121f', border: '1px solid #2a2a4a', color: '#e0e0e0', outline: 'none', width: 180 }} />
          <button onClick={handleSaveAndReturn} disabled={saving} style={{ padding: '10px 28px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', background: saving ? '#333' : 'linear-gradient(135deg, #6366f1, #a855f7)', border: 'none', color: '#fff', boxShadow: saving ? 'none' : '0 4px 20px rgba(99,102,241,0.4)', opacity: saving ? 0.6 : 1 }}>{saving ? '⏳ 保存中...' : '💾 保存布局并返回'}</button>
        </div>
      </div>

      {/* Right Sidebar */}
      <div style={{ width: 220, borderLeft: '1px solid #1e1e3a', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>属性面板</div>
        {selectedObj ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={labelStyle}>标签<input value={selectedObj.label} onChange={(e) => updateSelected({ label: e.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>颜色
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {COLOR_PALETTE.map((c) => (
                  <span key={c} onClick={() => updateSelected({ color: c })} style={{ width: 18, height: 18, borderRadius: 4, background: c, cursor: 'pointer', border: selectedObj.color === c ? '2px solid #fff' : '2px solid transparent', transition: 'transform 0.1s', }} />
                ))}
                <input type="color" value={selectedObj.color} onChange={(e) => updateSelected({ color: e.target.value })} style={{ width: 18, height: 18, padding: 0, border: '1px solid #555', borderRadius: 4, cursor: 'pointer', background: 'transparent' }} title="自定义颜色" />
              </div>
            </label>
            <label style={labelStyle}>朝向 ({Math.round((selectedObj.rotationY * 180) / Math.PI)}°)<input type="range" min={-Math.PI} max={Math.PI} step={0.1} value={selectedObj.rotationY} onChange={(e) => updateSelected({ rotationY: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: '#a855f7' }} /></label>
            {selectedObj.type !== 'character' && (<>
              <label style={labelStyle}>宽度 ({selectedObj.scaleX.toFixed(1)}x)<input type="range" min={0.3} max={3} step={0.1} value={selectedObj.scaleX} onChange={(e) => updateSelected({ scaleX: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: '#f59e0b' }} /></label>
              <label style={labelStyle}>深度 ({selectedObj.scaleZ.toFixed(1)}x)<input type="range" min={0.3} max={3} step={0.1} value={selectedObj.scaleZ} onChange={(e) => updateSelected({ scaleZ: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: '#f59e0b' }} /></label>
            </>)}
            <button onClick={deleteSelected} style={{ ...btnStyle('#dc2626'), marginTop: 4 }}>🗑️ 删除</button>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>点击色块选择<br />拖拽移动位置</div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Inline style helpers
   ================================================================ */

const btnStyle = (accentColor: string): React.CSSProperties => ({
  padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  background: `${accentColor}22`, border: `1px solid ${accentColor}55`, color: accentColor,
  transition: 'all 0.15s', textAlign: 'center',
});

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#888', display: 'flex', flexDirection: 'column', gap: 4,
};

const inputStyle: React.CSSProperties = {
  padding: '6px 8px', borderRadius: 6, fontSize: 12, background: '#12121f',
  border: '1px solid #2a2a4a', color: '#e0e0e0', outline: 'none', width: '100%',
};

