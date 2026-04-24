'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

/* ================================================================
   Types
   ================================================================ */

interface SceneObject {
  id: string;
  type: 'character' | 'sofa' | 'table' | 'chair' | 'bed' | 'bookshelf' | 'tv' | 'lamp' | 'cabinet' | 'counter' | 'partition' | 'rug';
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

// 扩展颜色选择器
const COLOR_PALETTE = [
  // 角色色
  '#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#a855f7',
  // 木材色
  '#8B4513', '#D2691E', '#A0522D', '#DEB887',
  // 中性色
  '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6',
  // 现代色
  '#1e293b', '#0f766e', '#be185d', '#7c3aed',
  // 金属色
  '#78716c', '#a8a29e', '#c0c0c0',
];

const FURNITURE_LABELS: Record<string, string> = {
  sofa: '沙发', table: '桌子', chair: '椅子', bed: '床',
  bookshelf: '书架', tv: '电视', lamp: '落地灯',
  cabinet: '柜子', counter: '柜台', partition: '隔断', rug: '地毯',
};

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
   3D Primitives – New Furniture
   ================================================================ */

function BedMesh({ color, selected }: { color: string; selected: boolean }) {
  return (
    <group>
      {/* Mattress */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[1.0, 0.2, 1.8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Headboard */}
      <mesh position={[0, 0.55, -0.85]} castShadow>
        <boxGeometry args={[1.0, 0.5, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Legs */}
      {[[-0.45, -0.85], [0.45, -0.85], [-0.45, 0.85], [0.45, 0.85]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.08, z]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.15, 8]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <ringGeometry args={[1.0, 1.06, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function BookshelfMesh({ color, selected }: { color: string; selected: boolean }) {
  return (
    <group>
      {/* Back panel */}
      <mesh position={[0, 0.7, -0.12]} castShadow>
        <boxGeometry args={[0.8, 1.4, 0.04]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Shelves */}
      {[0.05, 0.4, 0.75, 1.1, 1.4].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow>
          <boxGeometry args={[0.8, 0.04, 0.25]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
      {/* Side panels */}
      {[-0.38, 0.38].map((x, i) => (
        <mesh key={i} position={[x, 0.7, 0]} castShadow>
          <boxGeometry args={[0.04, 1.4, 0.25]} />
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

function TvMesh({ color, selected }: { color: string; selected: boolean }) {
  return (
    <group>
      {/* Screen */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[1.2, 0.7, 0.04]} />
        <meshStandardMaterial color={'#111111'} roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Bezel */}
      <mesh position={[0, 0.75, -0.025]}>
        <boxGeometry args={[1.25, 0.74, 0.01]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* Stand */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.4, 0.03, 0.25]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.65, 0.71, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function LampMesh({ color, selected }: { color: string; selected: boolean }) {
  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.18, 0.04, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 1.35, 8]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Shade */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.2, 0.3, 16, 1, true]} />
        <meshStandardMaterial color={'#f5f0e0'} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.22, 0.28, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function CabinetMesh({ color, selected }: { color: string; selected: boolean }) {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Door line */}
      <mesh position={[0, 0.4, 0.205]}>
        <boxGeometry args={[0.01, 0.7, 0.01]} />
        <meshStandardMaterial color={'#00000033'} roughness={0.5} />
      </mesh>
      {/* Handles */}
      {[-0.05, 0.05].map((x, i) => (
        <mesh key={i} position={[x, 0.4, 0.22]} castShadow>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color={'#c0c0c0'} roughness={0.3} metalness={0.7} />
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

function CounterMesh({ color, selected }: { color: string; selected: boolean }) {
  return (
    <group>
      {/* Counter top */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[1.5, 0.06, 0.5]} />
        <meshStandardMaterial color={'#d1d5db'} roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.43, 0]} castShadow>
        <boxGeometry args={[1.5, 0.87, 0.45]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.85, 0.91, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function PartitionMesh({ color, selected }: { color: string; selected: boolean }) {
  return (
    <group>
      {/* Panel */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[1.5, 1.8, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.5} transparent opacity={0.7} />
      </mesh>
      {/* Base feet */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 0.02, 0]} castShadow>
          <boxGeometry args={[0.15, 0.04, 0.3]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ))}
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.85, 0.91, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function RugMesh({ color, selected }: { color: string; selected: boolean }) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[1.5, 1.0]} />
        <meshStandardMaterial color={color} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.9, 0.96, 32]} />
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
    case 'character':  return <Mannequin color={obj.color} selected={selected} />;
    case 'sofa':       return <SofaMesh color={obj.color} selected={selected} />;
    case 'table':      return <TableMesh color={obj.color} selected={selected} />;
    case 'chair':      return <ChairMesh color={obj.color} selected={selected} />;
    case 'bed':        return <BedMesh color={obj.color} selected={selected} />;
    case 'bookshelf':  return <BookshelfMesh color={obj.color} selected={selected} />;
    case 'tv':         return <TvMesh color={obj.color} selected={selected} />;
    case 'lamp':       return <LampMesh color={obj.color} selected={selected} />;
    case 'cabinet':    return <CabinetMesh color={obj.color} selected={selected} />;
    case 'counter':    return <CounterMesh color={obj.color} selected={selected} />;
    case 'partition':  return <PartitionMesh color={obj.color} selected={selected} />;
    case 'rug':        return <RugMesh color={obj.color} selected={selected} />;
    default:           return null;
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
    if (!ctx) { alert('截图失败，请重试'); return; }
    
    const name = presetName.trim() || `布局_${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
    
    setSaving(true);
    try {
      ctx.gl.render(ctx.scene, ctx.camera);
      const src = ctx.gl.domElement;
      const maxW = 1280;
      const s = Math.min(1, maxW / src.width);
      const off = document.createElement('canvas');
      off.width = Math.round(src.width * s);
      off.height = Math.round(src.height * s);
      off.getContext('2d')!.drawImage(src, 0, 0, off.width, off.height);
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
        alert('保存失败: ' + (data.error || '未知错误'));
        return;
      }

      // 将新保存的预设 ID 传回
      const savedId = data.preset?.id || '';
      const target = new URL(effectiveReturnUrl, window.location.origin);
      if (savedId) target.searchParams.set('layoutPresetId', savedId);
      window.location.href = target.toString();
    } catch (e: any) {
      alert('保存失败: ' + e.message);
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

