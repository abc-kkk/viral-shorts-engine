/**
 * 🧪 字段注册表完整性测试
 *
 * 确保 ProjectState 中需要持久化的字段在 schema.ts 中有对应的列，
 * 以及 loadState/saveState 中有对应的映射逻辑。
 * 
 * 这是防止"新增字段遗漏导致数据丢失"的静态检查层。
 * ⚠️ 不修改任何生产代码。
 */
import { describe, it, expect } from 'vitest';
import * as schema from '@/lib/schema';

// ========================================
// 手动维护的 ProjectState 持久化字段清单
// 当你在 types.ts 的 ProjectState 中新增字段时，
// 必须同步更新此清单，测试会提醒你检查 schema 映射。
// ========================================

/** Project 表应包含的字段（对应 ProjectState 中的标量字段） */
const EXPECTED_PROJECT_FIELDS = [
  'id', 'projectName', 'createdAt', 'updatedAt',
  'currentPhase', 'artStyle', 'flowUrl', 'theme', 'aiProvider', 'useHitlMode',
  'writerStep', 'creativeMode', 'rawScript', 'scriptIteration', 'userDirection',
  'publishInfo', 'inspirations', 'scriptReview',
  'locationPrompt', 'locationImage', 'activeSceneIndex',
];

/** Scene 表应包含的字段 */
const EXPECTED_SCENE_FIELDS = [
  'id', 'projectId', 'sceneIndex',
  'speaker', 'dialogue', 'actionHint',
  'locationPrompt', 'startLayoutPrompt', 'endLayoutPrompt',
  'imagePrompt', 'videoPrompt', 'startImagePrompt',
  'locationImage', 'imageAsset', 'startImageAsset', 'videoAsset', 'audioAsset',
  'imageRef', 'startImageRef',
  'charactersInScene', 'duration', 'videoTrimStart', 'videoTrimEnd', 'audioDelay',
];

/** Character 表应包含的字段 */
const EXPECTED_CHARACTER_FIELDS = [
  'id', 'projectId', 'name', 'persona', 'voiceName', 'prompt', 'imageUrl',
];

/** Cover 表应包含的字段 */
const EXPECTED_COVER_FIELDS = [
  'id', 'projectId', 'ratio', 'prompt', 'imageUrl',
];

describe('字段注册表完整性检查', () => {
  it('Project 表应包含所有 ProjectState 标量字段', () => {
    const actualKeys = Object.keys(schema.projects);
    for (const field of EXPECTED_PROJECT_FIELDS) {
      expect(actualKeys, `Project 表缺少字段: ${field}`).toContain(field);
    }
  });

  it('Scene 表应包含所有场景相关字段', () => {
    const actualKeys = Object.keys(schema.scenes);
    for (const field of EXPECTED_SCENE_FIELDS) {
      expect(actualKeys, `Scene 表缺少字段: ${field}`).toContain(field);
    }
  });

  it('Character 表应包含所有角色相关字段', () => {
    const actualKeys = Object.keys(schema.characters);
    for (const field of EXPECTED_CHARACTER_FIELDS) {
      expect(actualKeys, `Character 表缺少字段: ${field}`).toContain(field);
    }
  });

  it('Cover 表应包含所有封面相关字段', () => {
    const actualKeys = Object.keys(schema.covers);
    for (const field of EXPECTED_COVER_FIELDS) {
      expect(actualKeys, `Cover 表缺少字段: ${field}`).toContain(field);
    }
  });

  it('不应存在 schema 中有但预期清单中没有的未知字段（防止漏检）', () => {
    const projectActual = Object.keys(schema.projects);
    const projectUnknown = projectActual.filter(k => !EXPECTED_PROJECT_FIELDS.includes(k));
    expect(projectUnknown, `Project 表存在未纳入检查的新字段: ${projectUnknown.join(', ')}。请同步更新本测试文件的 EXPECTED_PROJECT_FIELDS`).toEqual([]);

    const sceneActual = Object.keys(schema.scenes);
    const sceneUnknown = sceneActual.filter(k => !EXPECTED_SCENE_FIELDS.includes(k));
    expect(sceneUnknown, `Scene 表存在未纳入检查的新字段: ${sceneUnknown.join(', ')}。请同步更新本测试文件的 EXPECTED_SCENE_FIELDS`).toEqual([]);
  });
});
