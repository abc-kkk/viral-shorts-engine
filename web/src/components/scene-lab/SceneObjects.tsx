import React from 'react';
import * as THREE from 'three';
import { SceneObject } from './types';

function Mannequin({ color, selected }: { color: string; selected: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.18, 0.9, 16]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.18, 0]} castShadow>
        <sphereGeometry args={[0.17, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.18, 0.2]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.28, 0.34, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

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

function BedMesh({ color, selected }: { color: string; selected: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[1.0, 0.2, 1.8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.55, -0.85]} castShadow>
        <boxGeometry args={[1.0, 0.5, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
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
      <mesh position={[0, 0.7, -0.12]} castShadow>
        <boxGeometry args={[0.8, 1.4, 0.04]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {[0.05, 0.4, 0.75, 1.1, 1.4].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow>
          <boxGeometry args={[0.8, 0.04, 0.25]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
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
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[1.2, 0.7, 0.04]} />
        <meshStandardMaterial color={'#111111'} roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.75, -0.025]}>
        <boxGeometry args={[1.25, 0.74, 0.01]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
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
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.18, 0.04, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 1.35, 8]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>
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
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.4, 0.205]}>
        <boxGeometry args={[0.01, 0.7, 0.01]} />
        <meshStandardMaterial color={'#00000033'} roughness={0.5} />
      </mesh>
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
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[1.5, 0.06, 0.5]} />
        <meshStandardMaterial color={'#d1d5db'} roughness={0.3} metalness={0.2} />
      </mesh>
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
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[1.5, 1.8, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.5} transparent opacity={0.7} />
      </mesh>
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

export function ObjectMesh({ obj, selected }: { obj: SceneObject; selected: boolean }) {
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
