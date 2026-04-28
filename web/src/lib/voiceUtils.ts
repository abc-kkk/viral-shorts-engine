import { VOICE_OPTIONS } from './constants';
import type { Character } from './types';

/**
 * 从角色信息（persona / voice / name）中识别性别
 */
export function detectGender(character: Character): 'male' | 'female' {
  // 1. 检查 voice 字段
  if (character.voice) {
    const voice = character.voice.toLowerCase();
    if (voice.includes('女') || voice.includes('female') || voice.includes('woman') || voice.includes('girl') || voice.includes('小姐') || voice.includes('女士')) {
      return 'female';
    }
    if (voice.includes('男') || voice.includes('male') || voice.includes('man') || voice.includes('boy') || voice.includes('先生') || voice.includes('男士')) {
      return 'male';
    }
  }

  // 2. 检查 persona 字段
  if (character.persona) {
    const persona = character.persona.toLowerCase();
    if (persona.includes('女') || persona.includes('female') || persona.includes('woman') || persona.includes('girl') || persona.includes('小姐') || persona.includes('女士')) {
      return 'female';
    }
    if (persona.includes('男') || persona.includes('male') || persona.includes('man') || persona.includes('boy') || persona.includes('先生') || persona.includes('男士')) {
      return 'male';
    }
  }

  // 3. 检查名字（简单规则）
  if (character.name) {
    const name = character.name;
    const femaleNameKeywords = ['婷', '娜', '芳', '花', '玲', '萍', '燕', '美', '雪', '梅', '丽', '娟', '红', '英', '华', '凤', '云', '霞', '莉', '雯', '静', '秀', '桂', '珍', '兰', '凤'];
    const maleNameKeywords = ['强', '伟', '军', '杰', '涛', '明', '华', '平', '刚', '文', '辉', '鹏', '健', '斌', '波', '宇', '浩', '轩', '博', '凯'];
    
    for (const keyword of femaleNameKeywords) {
      if (name.includes(keyword)) return 'female';
    }
    for (const keyword of maleNameKeywords) {
      if (name.includes(keyword)) return 'male';
    }
  }

  // 4. 默认如果是主角，我们默认主角可能是男或女，这里默认女性（因为默认声音是 Zephyr）
  return character.isProtagonist ? 'female' : 'male';
}

/**
 * 获取对应性别的默认声音
 */
export function getDefaultVoice(gender: 'male' | 'female'): string {
  // 收集所有该性别的声音选项
  const voices = VOICE_OPTIONS.flatMap(group => 
    group.options.filter(opt => {
      const label = opt.label.toLowerCase();
      if (gender === 'female') {
        return label.includes('女');
      } else {
        return label.includes('男');
      }
    })
  );

  // 默认女声：Zephyr 是第一个
  if (gender === 'female') {
    const femaleVoice = voices.find(v => v.id === 'Zephyr') || voices[0];
    return femaleVoice?.id || 'Zephyr';
  }

  // 默认男声：Puck 是第一个
  if (gender === 'male') {
    const maleVoice = voices.find(v => v.id === 'Puck') || voices.find(v => v.label.includes('男')) || voices[0];
    return maleVoice?.id || 'Puck';
  }

  return 'Zephyr'; // 兜底
}

/**
 * 自动给角色配置合适的声音
 */
export function autoConfigureVoice(character: Character): Character {
  // 如果已经配置了 voiceName，不覆盖
  if (character.voiceName) return character;

  // 否则自动配置
  const gender = detectGender(character);
  const defaultVoice = getDefaultVoice(gender);
  return { ...character, voiceName: defaultVoice };
}

/**
 * 批量自动配置声音
 */
export function autoConfigureVoices(characters: Character[]): Character[] {
  return characters.map(autoConfigureVoice);
}

