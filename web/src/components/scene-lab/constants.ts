import { CameraPreset } from './types';

export const CAMERA_PRESETS: CameraPreset[] = [
  { name: '正面',   position: [0, 1.6, 6],   target: [0, 0.8, 0] },
  { name: '45度',   position: [4, 3, 4],     target: [0, 0.5, 0] },
  { name: '低角度', position: [0, 0.3, 5],   target: [0, 1, 0]   },
  { name: '俯视',   position: [0, 8, 0.5],   target: [0, 0, 0]   },
  { name: '左侧面', position: [-6, 1.6, 0],  target: [0, 0.8, 0] },
  { name: '右侧面', position: [6, 1.6, 0],   target: [0, 0.8, 0] },
  { name: '背面',   position: [0, 1.6, -6],  target: [0, 0.8, 0] },
];

export const CHARACTER_COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#a855f7'];
export const FURNITURE_COLOR = '#8B4513';

export const COLOR_PALETTE = [
  '#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#a855f7',
  '#8B4513', '#D2691E', '#A0522D', '#DEB887',
  '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6',
  '#1e293b', '#0f766e', '#be185d', '#7c3aed',
  '#78716c', '#a8a29e', '#c0c0c0',
];

export const FURNITURE_LABELS: Record<string, string> = {
  sofa: '沙发', table: '桌子', chair: '椅子', bed: '床',
  bookshelf: '书架', tv: '电视', lamp: '落地灯',
  cabinet: '柜子', counter: '柜台', partition: '隔断', rug: '地毯',
};

export const STORAGE_KEY_IMG = 'scenelab_layout_image';
export const STORAGE_KEY_OBJ = 'scenelab_objects';
