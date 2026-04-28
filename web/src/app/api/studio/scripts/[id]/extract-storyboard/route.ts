import { NextRequest, NextResponse } from 'next/server';
import { getScriptById, updateScript, listAssets } from '@/lib/studio/db';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:4100';

/**
 * 阶段 1：结构提取 — 只拆剧情骨架
 *
 * 只输出镜头组 + 镜头的画面描述 + 台词 + 角色 + 场景关联。
 * 不输出 firstFramePrompt / lastFramePrompt / videoPrompt（由 generate-shot-prompts 逐镜头精雕）。
 */
const SYSTEM_PROMPT = `
你是一位专业的电影分镜师。请阅读以下短剧剧本，将其结构化地拆解为【镜头组（场景）】和具体的【镜头（Shot）】。

=== 你的唯一任务：拆解剧情结构 ===
你只需要把剧本拆分成镜头组和镜头，描述每个镜头的画面内容。
⚠️ 不要生成任何"提示词"（firstFramePrompt / lastFramePrompt / videoPrompt），这些会由后续流程单独处理。

=== 拆分规则 ===
1. "镜头组" (Camera Group) 对应剧本中一个具体的物理场景或段落转换。
2. 每个镜头组包含：
   - "title"：标题（如"镜头组1：办公室冲突"）
   - "context"：简述空间/时间/核心动作
   - "sceneName"：该组对应的场景资产名称（从已知场景列表中精确选择）
3. 每个镜头组内包含多个连续的镜头 (shots)。
4. 每个镜头必须包含：
   - "visual"：画面描述（景别、视角、人物动作、表情、环境细节），要尽可能详细
   - "dialogue"：台词/旁白（无则空字符串）
   - "speaker"：说话角色名（无则空字符串，旁白则写"旁白"）
   - "characters"：出现在该镜头中的角色名列表

=== 画面描述 (visual) 的质量要求 ===
- 必须包含景别（特写/近景/中景/全景/远景）
- 必须描述人物的具体动作和表情，不能笼统
- 需要包含环境/光线/氛围描述
- 多人场景必须明确每个角色的位置和动作
- 跟班/随从等群体角色必须分配独立视觉标签区分（如"灰衣瘦高跟班""蓝衣圆脸跟班"），使用具体数量（"两个跟班"而非"几个人"）

=== 拆分节奏 ===
- 按 时间/场景/情节转折点 拆分，每个镜头对应约 10-15 秒的视频内容
- 每个镜头的台词字数不超过 30 个字
- 必须完整覆盖剧本的全部重要情节，不得遗漏
- 原文的台词不得删改

=== 输出格式 ===
必须返回纯 JSON，严格遵循以下结构，不要有任何额外文本或 Markdown 标记：

{
  "groups": [
    {
      "id": "g1",
      "title": "镜头组1：办公室冲突",
      "context": "空间：总裁办公室。时间：白天。动作：男主推门而入，与反派对峙。",
      "sceneName": "苏氏集团总裁办公室",
      "shots": [
        {
          "id": "s1-1",
          "visual": "【全景】男主愤怒地推开办公室双扇大门，门框两侧的盆栽被气流带动微微晃动。反派身着深灰色西装，坐在巨大的红木办公桌后，双手交叉撑在下巴前，嘴角挂着冷笑。落地窗外的城市天际线模糊可见，百叶窗投下条纹状阴影。",
          "speaker": "赵天霸",
          "dialogue": "你终于来了。",
          "characters": ["林辰", "赵天霸"]
        }
      ]
    }
  ]
}

=== 注意 ===
- 必须从已知的角色和场景名称列表中选择名字，确保精确匹配
- JSON 必须是合法的
`;

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const scriptId = decodeURIComponent(params.id);
    
    const script = getScriptById(scriptId);

    if (!script) {
      return NextResponse.json({ error: '剧本不存在' }, { status: 404 });
    }

    if (!script.content || script.content.trim() === '') {
      return NextResponse.json({ error: '剧本内容为空，无法提取分镜' }, { status: 400 });
    }

    // 获取已有的资产名称列表，供 AI 精确引用
    const assets = listAssets({ scriptId });
    const characterNames = assets.filter(a => a.type === 'character').map(a => a.name);
    const sceneNames = assets.filter(a => a.type === 'scene').map(a => a.name);

    const assetContext = `
已知角色列表（必须精确使用这些名称）：${characterNames.join('、') || '暂无'}
已知场景列表（必须精确使用这些名称）：${sceneNames.join('、') || '暂无'}
`;

    const userPrompt = `${assetContext}\n请分析以下短剧剧本，提取分镜结构：\n\n---\n${script.content}\n---`;
    
    const res = await fetch(`${AI_GATEWAY_URL}/api/text/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: userPrompt,
        forceJson: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`AI Gateway Error: ${await res.text()}`);
    }

    const data = await res.json();
    let text = (data.text || '').trim();

    // Clean markdown blocks if present
    if (text.startsWith('```')) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) text = match[1];
    }
    
    const parsed = JSON.parse(text);
    
    // 规范化输出，提示词字段置空（由 generate-shot-prompts 逐镜头生成）
    const groups = parsed.groups.map((g: any, gIdx: number) => ({
      id: g.id || `g${gIdx + 1}`,
      title: g.title,
      context: g.context,
      sceneName: g.sceneName || '',
      shots: g.shots.map((s: any, sIdx: number) => ({
        id: s.id || `s${gIdx + 1}-${sIdx + 1}`,
        visual: s.visual,
        speaker: s.speaker || '',
        dialogue: s.dialogue || '',
        characters: s.characters || [],
        firstFramePrompt: '',
        lastFramePrompt: '',
        videoPrompt: '',
        status: 'pending',
      }))
    }));

    // 持久化到 script.metadata.storyboardGroups
    updateScript(scriptId, {
      metadata: { storyboardGroups: groups },
    });

    return NextResponse.json({ groups });

  } catch (error: any) {
    console.error('Failed to extract storyboard:', error);
    return NextResponse.json({ error: error.message || '内部错误' }, { status: 500 });
  }
}
