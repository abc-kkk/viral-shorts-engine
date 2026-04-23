import { NextRequest, NextResponse } from 'next/server';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:4100';

export async function POST(req: NextRequest) {
  try {
    const { description, characters, allObjects, hasLayout, layoutLabel, hasScene, sceneLabel, styleTag } = await req.json();

    // Build context about available materials
    const materialInfo: string[] = [];
    if (hasLayout) {
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
    if (characters && characters.length > 0) {
      characters.forEach((c: any) => {
        materialInfo.push(`- 角色「${c.label}」：色块颜色为 ${c.color}，提示词中用 {@${c.label}} 引用其定妆照`);
      });
    }
    if (hasScene && sceneLabel) materialInfo.push(`- 场景参考图：Flow 资产名为「${sceneLabel}」，提示词中用 {@${sceneLabel}} 引用`);

    const systemPrompt = `你是一个 AI 绘图提示词专家。用户正在使用 Nano Banana Pro 模型生图。

用户有以下素材可用：
${materialInfo.join('\n')}

风格倾向：${styleTag || '写实'}

【核心规则】
1. 提示词必须是纯中文
2. 引用素材时必须用 {@名称} 语法，例如 {@男主}、{@场景}、{@布局图}
3. 如果有布局参考图，必须在提示词中说明"站位/构图以 {@布局图} 为参照"
4. 描述色块对应关系时，只能描述上面【实际存在的色块】列表中的颜色和物体，严禁编造不存在的色块颜色！
5. 提示词要包含：物体/人物描述、环境氛围、光线、构图、画面风格
6. 不要写任何解释说明，直接输出可用的提示词
7. 提示词长度控制在 100-200 字
8. 【极其重要】只能引用上面列出的素材！没有的素材不要凭空引用！没有角色就不要写角色，没有场景参考图就不要写 {@场景}`;

    const hasChars = characters && characters.length > 0;
    const userPrompt = description && description.trim()
      ? `用户描述：${description}\n\n请根据以上描述和可用素材，生成一段精准的 Nano Banana Pro 生图提示词。`
      : `请根据可用素材，生成一段通用的生图提示词。${hasChars ? '展现角色在场景中自然互动的画面。' : '展现该场景真实的材质与光影质感，不需要人物出现。'}`;

    // 走 ai-gateway 的文本生成端点（劫持网页方式，非 API）
    const gatewayRes = await fetch(`${AI_GATEWAY_URL}/api/text/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        forceJson: false,
        provider: 'gemini',
      }),
    });

    if (!gatewayRes.ok) {
      const errBody = await gatewayRes.json().catch(() => ({ error: `Gateway returned ${gatewayRes.status}` }));
      return NextResponse.json({ success: false, error: `AI Gateway Error: ${errBody.error}` });
    }

    const data = await gatewayRes.json();
    const text = (data.text || '').trim();

    if (!text) {
      return NextResponse.json({ success: false, error: 'AI 返回空结果' });
    }

    return NextResponse.json({ success: true, prompt: text });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
