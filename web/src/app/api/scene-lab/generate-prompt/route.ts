import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/llm/generateText';

export async function POST(req: NextRequest) {
  try {
    const { description, characters, allObjects, hasLayout, layoutLabel, hasScene, sceneLabel, styleTag, activeTarget } = await req.json();

    let targetInstructions = '';
    let isCharOnly = false;
    let isSceneOnly = false;
    let targetChar: any = null;

    if (activeTarget && activeTarget.startsWith('char_')) {
      isCharOnly = true;
      const charId = activeTarget.replace('char_', '');
      targetChar = characters.find((c: any) => c.id === charId || c.label === activeTarget.replace('char_', '')); // Fallback
      if (!targetChar && characters.length > 0) targetChar = characters[0]; // Extra fallback
      targetInstructions = `当前任务：为【角色：${targetChar ? targetChar.label : '未知角色'}】生成「单人定妆照」提示词。
绝对不要生成场景或其他人，画面只聚焦于该角色本身。`;
    } else if (activeTarget === 'scene') {
      isSceneOnly = true;
      targetInstructions = `当前任务：生成纯粹的【空场景参考图】提示词。
绝对不要在画面中生成任何人物/角色。聚焦于光影、建筑、家具、材质和氛围。`;
    } else {
      targetInstructions = `当前任务：生成完整的【场景+角色互动的最终画面】提示词。`;
    }

    // Build context about available materials
    const materialInfo: string[] = [];
    
    if (!isCharOnly && hasLayout) {
      materialInfo.push(`- 布局参考图：已有 3D 色块布局截图，Flow 资产名为「${layoutLabel}」，提示词中用 {@${layoutLabel}} 引用`);
      // Describe exactly what's in the layout
      if (allObjects && allObjects.length > 0) {
        const objDesc = allObjects.map((o: any) => {
          const typeMap: Record<string, string> = { character: '角色', sofa: '沙发', table: '桌子', chair: '椅子' };
          return `  - ${o.color} 色块 = ${typeMap[o.type] || o.type}（${o.label}）`;
        }).join('\n');
        materialInfo.push(`  布局图中【实际存在的色块】如下（没有列出的颜色就不存在，不要编造）：\n${objDesc}`);
      }
    }
    
    if (!isSceneOnly && characters && characters.length > 0) {
      if (isCharOnly && targetChar) {
         materialInfo.push(`- 角色「${targetChar.label}」：需要为其设计定妆照提示词。`);
      } else {
         characters.forEach((c: any) => {
           materialInfo.push(`- 角色「${c.label}」：色块颜色为 ${c.color}，提示词中用 {@${c.label}} 引用其定妆照`);
         });
      }
    }
    
    if (!isCharOnly && hasScene && sceneLabel) {
       materialInfo.push(`- 场景参考图：Flow 资产名为「${sceneLabel}」，提示词中用 {@${sceneLabel}} 引用`);
    }

    const systemPrompt = `你是一个 AI 绘图提示词专家。用户正在使用 Nano Banana Pro 模型生图。

${targetInstructions}

用户有以下素材可用：
${materialInfo.length > 0 ? materialInfo.join('\n') : '无可用参考图，请直接根据描述纯文生图。'}

风格倾向：${styleTag || '写实'}

【核心规则】
1. 提示词必须是纯中文（即使引用的标签名是英文，外部描述也必须全中文）
2. 引用素材时必须用 {@名称} 语法，严格匹配上面列出的引用标签名
3. 如果有布局参考图，必须在提示词中说明"站位/构图以 {@${layoutLabel || '布局图'}} 为参照"
4. 描述色块对应关系时，只能描述上面【实际存在的色块】列表中的颜色和物体，严禁编造不存在的色块颜色！
5. 提示词要包含：物体/人物描述、环境氛围、光线、构图、画面风格
6. 不要写任何解释说明，直接输出可用的提示词
7. 提示词长度控制在 100-200 字
8. 【极其重要】只能引用上面列出的素材！没有的素材不要凭空引用！没有角色就不要写角色，如果没有场景参考图就绝对不要写 {@${sceneLabel || '场景'}}`;

    const hasChars = !isSceneOnly && characters && characters.length > 0;
    
    let defaultGoal = '展现该场景真实的材质与光影质感，不需要人物出现。';
    if (isCharOnly) defaultGoal = `展现角色 ${targetChar?.label || ''} 的外貌、服装和气质，背景纯色或简单背景。`;
    else if (hasChars) defaultGoal = '展现角色在场景中自然互动的画面。';

    const userPrompt = description && description.trim()
      ? `用户描述：${description}\n\n请根据以上描述和可用素材，生成一段精准的 Nano Banana Pro 生图提示词。`
      : `请根据可用素材，生成一段通用的生图提示词。${defaultGoal}`;

    // 走共享的大模型生成逻辑
    const text = await generateText({
      systemPrompt,
      userPrompt,
      forceJson: false,
    });

    if (!text) {
      return NextResponse.json({ success: false, error: 'AI 返回空结果' });
    }

    return NextResponse.json({ success: true, prompt: text });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
