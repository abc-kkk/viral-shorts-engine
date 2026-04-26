export interface SceneObject {
  id: string;
  type: 'character' | 'sofa' | 'table' | 'chair' | 'bed' | 'bookshelf' | 'tv' | 'lamp' | 'cabinet' | 'counter' | 'partition' | 'rug' | 'camera';
  position: [number, number, number];
  rotationY: number;
  color: string;
  label: string;
  scaleX: number;
  scaleZ: number;
}

export interface CameraPreset {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
}
