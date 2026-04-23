'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

/* ================================================================
   Types
   ================================================================ */

interface SceneObject {
  id: string;
  type: 'character' | 'sofa' | 'table' | 'chair';
  position: [number, number, number];
  rotationY: number;
  color: string;
  label: string;
  scaleX: number;
  scaleZ: number;
}

interface CameraPreset {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
}

/* ================================================================
   Constants
   ================================================================ */

const CAMERA_PRESETS: CameraPreset[] = [
  { name: '正面',   position: [0, 1.6, 6],   target: [0, 0.8, 0] },
  { name: '45度',   position: [4, 3, 4],     target: [0, 0.5, 0] },
  { name: '低角度', position: [0, 0.3, 5],   target: [0, 1, 0]   },
  { name: '俯视',   position: [0, 8, 0.5],   target: [0, 0, 0]   },
  { name: '左侧面', position: [-6, 1.6, 0],  target: [0, 0.8, 0] },
  { name: '右侧面', position: [6, 1.6, 0],   target: [0, 0.8, 0] },
  { name: '背面',   position: [0, 1.6, -6],  target: [0, 0.8, 0] },
];

const CHARACTER_COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#a855f7'];
const FURNITURE_COLOR = '#8B4513';

/* ================================================================
   3D Primitives – Mannequin
   ================================================================ */

function Mannequin({ color, selected }: { color: string; selected: boolean }) {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.18, 0.9, 16]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.18, 0]} castShadow>
        <sphereGeometry args={[0.17, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Direction indicator (nose) */}
      <mesh position={[0, 1.18, 0.2]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Selection ring */}
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.28, 0.34, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/* ================================================================
   3D Primitives – Furniture
   ================================================================ */

function SofaMesh({ color, selected }: { color: string; selected: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[1.2, 0.25, 0.55]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.5, -0.22]} castShadow>
        <boxGeometry args={[1.2, 0.35, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[-0.55, 0.32, 0]} castShadow>
        <boxGeometry args={[0.1, 0.4, 0.55]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0.55, 0.32, 0]} castShadow>
        <boxGeometry args={[0.1, 0.4, 0.55]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.7, 0.76, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function TableMesh({ color, selected }: { color: string; selected: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[0.8, 0.05, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {[[-0.35, -0.2], [0.35, -0.2], [-0.35, 0.2], [0.35, 0.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.18, z]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.35, 8]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.5, 0.56, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function ChairMesh({ color, selected }: { color: string; selected: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.4, 0.05, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.5, -0.17]} castShadow>
        <boxGeometry args={[0.4, 0.45, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {[[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.11, z]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.22, 8]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.3, 0.36, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/* ================================================================
   Render object by type
   ================================================================ */

function ObjectMesh({ obj, selected }: { obj: SceneObject; selected: boolean }) {
  switch (obj.type) {
    case 'character': return <Mannequin color={obj.color} selected={selected} />;
    case 'sofa':      return <SofaMesh color={obj.color} selected={selected} />;
    case 'table':     return <TableMesh color={obj.color} selected={selected} />;
    case 'chair':     return <ChairMesh color={obj.color} selected={selected} />;
    default:          return null;
  }
}

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

export const STORAGE_KEY_IMG = 'scenelab_layout_image';
export const STORAGE_KEY_OBJ = 'scenelab_objects';

function getDefaultObjects(): SceneObject[] {
  return [
    { id: 'char_1', type: 'character', position: [-1, 0, 0], rotationY: 0, color: CHARACTER_COLORS[0], label: '男主', scaleX: 1, scaleZ: 1 },
    { id: 'char_2', type: 'character', position: [1, 0, 0], rotationY: 0, color: CHARACTER_COLORS[1], label: '女主', scaleX: 1, scaleZ: 1 },
  ];
}

export default function SceneLabEditor() {
  const [objects, setObjects] = useState<SceneObject[]>(() => {
    if (typeof window === 'undefined') return getDefaultObjects();
    try { const s = localStorage.getItem(STORAGE_KEY_OBJ); return s ? JSON.parse(s) : getDefaultObjects(); }
    catch { return getDefaultObjects(); }
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCameraPreset, setActiveCameraPreset] = useState<CameraPreset | null>(null);
  const screenshotRef = useRef<{ gl: any; scene: any; camera: any } | null>(null);
  const selectedObj = objects.find((o) => o.id === selectedId) ?? null;

  const addObject = useCallback((type: SceneObject['type']) => {
    const colorIdx = objects.filter((o) => o.type === 'character').length;
    const obj: SceneObject = {
      id: newId(), type, position: [0, 0, 0], rotationY: 0,
      color: type === 'character' ? CHARACTER_COLORS[colorIdx % CHARACTER_COLORS.length] : FURNITURE_COLOR,
      label: type === 'character' ? `角色${colorIdx + 1}` : type === 'sofa' ? '沙发' : type === 'table' ? '桌子' : '椅子',
      scaleX: 1, scaleZ: 1,
    };
    setObjects((prev) => [...prev, obj]);
    setSelectedId(obj.id);
  }, [objects]);

  const deleteSelected = useCallback(() => { if (!selectedId) return; setObjects((prev) => prev.filter((o) => o.id !== selectedId)); setSelectedId(null); }, [selectedId]);
  const moveObject = useCallback((id: string, pos: [number, number, number]) => { setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, position: pos } : o))); }, []);
  const updateSelected = useCallback((patch: Partial<SceneObject>) => { if (!selectedId) return; setObjects((prev) => prev.map((o) => (o.id === selectedId ? { ...o, ...patch } : o))); }, [selectedId]);

  const handleSaveAndReturn = useCallback(() => {
    const ctx = screenshotRef.current;
    if (!ctx) { alert('截图失败，请重试'); return; }
    ctx.gl.render(ctx.scene, ctx.camera);
    const src = ctx.gl.domElement;
    const maxW = 1280;
    const s = Math.min(1, maxW / src.width);
    const off = document.createElement('canvas');
    off.width = Math.round(src.width * s);
    off.height = Math.round(src.height * s);
    off.getContext('2d')!.drawImage(src, 0, 0, off.width, off.height);
    localStorage.setItem(STORAGE_KEY_IMG, off.toDataURL('image/png'));
    localStorage.setItem(STORAGE_KEY_OBJ, JSON.stringify(objects));
    window.location.href = '/scene-lab';
  }, [objects]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', background: '#0a0a14', color: '#e0e0e0', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      {/* Left Sidebar */}
      <div style={{ width: 210, borderRight: '1px solid #1e1e3a', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#a78bfa' }}>🎬 布景编辑器</div>
        <div style={{ fontSize: 10, color: '#555', lineHeight: 1.4 }}>拖拽色块摆放站位，切换视角，完成后保存返回</div>
        <button onClick={() => addObject('character')} style={btnStyle('#22c55e')}>＋ 添加角色</button>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => addObject('sofa')} style={{ ...btnStyle('#8B4513'), flex: 1, fontSize: 11 }}>沙发</button>
          <button onClick={() => addObject('table')} style={{ ...btnStyle('#8B4513'), flex: 1, fontSize: 11 }}>桌子</button>
          <button onClick={() => addObject('chair')} style={{ ...btnStyle('#8B4513'), flex: 1, fontSize: 11 }}>椅子</button>
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
          <button onClick={() => { window.location.href = '/scene-lab'; }} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#1e1e3a', border: '1px solid #2a2a4a', color: '#999' }}>取消返回</button>
          <button onClick={handleSaveAndReturn} style={{ padding: '10px 28px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #a855f7)', border: 'none', color: '#fff', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>💾 保存布局并返回</button>
        </div>
      </div>

      {/* Right Sidebar */}
      <div style={{ width: 220, borderLeft: '1px solid #1e1e3a', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>属性面板</div>
        {selectedObj ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={labelStyle}>标签<input value={selectedObj.label} onChange={(e) => updateSelected({ label: e.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>颜色
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[...CHARACTER_COLORS, '#8B4513', '#666666', '#e0e0e0'].map((c) => (
                  <span key={c} onClick={() => updateSelected({ color: c })} style={{ width: 22, height: 22, borderRadius: 5, background: c, cursor: 'pointer', border: selectedObj.color === c ? '2px solid #fff' : '2px solid transparent' }} />
                ))}
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

