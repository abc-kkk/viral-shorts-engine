import { describe, it, expect } from 'vitest';
import { generateAssetFilename } from '@/lib/assetUrl';

describe('assetUrl utils', () => {
  it('should generate valid filename for locationImage', () => {
    const name = generateAssetFilename('locationImage', 'proj1');
    expect(name).toBe('场景.png');
  });

  it('should generate valid filename for characterImage with meta', () => {
    const name = generateAssetFilename('characterImage', 'proj1', 0, { charName: '鸭子' });
    expect(name).toBe('鸭子.png');
  });

  it('should generate valid filename for sceneImage with index', () => {
    const name = generateAssetFilename('sceneImage', 'proj1', 5);
    expect(name).toBe('proj1_S5_Img.png');
  });

  it('should handle video generation', () => {
    const name = generateAssetFilename('sceneVideo', 'proj1', 2, undefined, 'video');
    expect(name).toBe('proj1_S2_Vid.mp4');
  });
  
  it('should use random fallback if index is missing for sceneImage', () => {
    const name = generateAssetFilename('sceneImage', 'proj1');
    expect(name).toMatch(/^img_\d+\.png$/);
  });
});
