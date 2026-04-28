import { NextRequest, NextResponse } from 'next/server';
import { getScriptById, updateScript, listAssets } from '@/lib/studio/db';
import { generateText } from '@/lib/llm/generateText';

/**
 * 阶段 1：结构提取 — 只拆剧情骨架
 *
 * 只输出镜头组 + 镜头的画面描述 + 台词 + 角色 + 场景关联。
 * 不输出 firstFramePrompt / lastFramePrompt / videoPrompt（由 generate-shot-prompts 逐镜头精雕）。
 */
const SYSTEM_PROMPT_1 = `
你是一位专业的电影分镜师。请阅读以下短剧剧本，将其结构化地拆解为【镜头组（场景）】和具体的【镜头（Shot）】。

=== 你的唯一任务：拆解剧情结构 ===
你只需要把剧本拆分成镜头组和镜头，描述每个镜头的画面内容。
⚠️ 不要生成任何"提示词"（firstFramePrompt / lastFramePrompt / videoPrompt）。

=== 拆分规则 ===
1. "镜头组" (Camera Group) 对应剧本中一个具体的物理场景或段落转换。
2. 每个镜头组包含：
   - "title"：标题（如"镜头组1：办公室冲突"）
   - "context"：简述空间/时间/核心动作
   - "sceneName"：该组对应的原始场景名称
3. 每个镜头组内包含多个连续的镜头 (shots)。
4. 每个镜头必须包含：
   - "visual"：画面描述（景别、视角、人物动作、表情、环境细节），要尽可能详细
   - "dialogue"：台词/旁白（无则空字符串）
   - "speaker"：说话角色名（无则空字符串，旁白则写"旁白"）
   - "characters"：出现在该镜头中的角色名列表（剧本原文角色）
   - "props"：出现在该镜头中的关键道具列表（剧本原文道具，无则传空数组 []）

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
      "sceneName": "总裁办公室",
      "shots": [
        {
          "id": "s1-1",
          "visual": "【全景】男主愤怒地推开办公室双扇大门，门框两侧的盆栽被气流带动微微晃动。反派身着深灰色西装，坐在巨大的红木办公桌后，双手交叉撑在下巴前，嘴角挂着冷笑。落地窗外的城市天际线模糊可见，百叶窗投下条纹状阴影。",
          "speaker": "赵天霸",
          "dialogue": "你终于来了。",
          "characters": ["林辰", "赵天霸"],
          "props": ["红木办公桌", "盆栽"]
        }
      ]
    }
  ]
}
`;

const SYSTEM_PROMPT_2 = `
你是一位专业的剧组统筹。你的任务是将分镜脚本中提取出的原始【场景】、【角色】和【道具】名词，精确映射到剧组已注册的资产名称库中。

=== 映射规则 ===
1. 你会接收到一份 JSON 格式的分镜列表，以及当前已知的角色、场景和道具库。
2. 请为每一个镜头组 (group) 挑选最匹配的已知场景资产名称。
3. 请为每一个镜头 (shot) 挑选最匹配的已知角色和道具资产名称。
4. 必须精确使用已知列表中的名字！如果原文提到的人或物在已知列表中不存在匹配项，请直接忽略（传空字符串 "" 或空数组 []），绝对不能自己编造不在列表中的名字。

=== 输出格式 ===
必须返回纯 JSON，严格遵循以下结构，不要有任何额外文本：

{
  "groups": [
    {
      "id": "g1",
      "sceneName": "苏氏集团总裁办公室" // 从已知场景列表精确匹配，无匹配传 ""
    }
  ],
  "shots": [
    {
      "id": "s1-1",
      "characters": ["林辰_成年", "赵天霸_反派"], // 从已知角色列表精确匹配
      "props": ["豪华红木办公桌"] // 从已知道具列表精确匹配
    }
  ]
}
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

    // 第一步：只提取剧情结构
    const userPrompt1 = `请分析以下短剧剧本，提取分镜结构：\n\n---\n${script.content}\n---`;
    
    let text1 = await generateText({
      systemPrompt: SYSTEM_PROMPT_1,
      userPrompt: userPrompt1,
      forceJson: true,
    });

    if (text1.startsWith('```')) {
      const match = text1.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) text1 = match[1];
    }
    
    let parsed1;
    try {
      parsed1 = JSON.parse(text1);
    } catch (e) {
      console.error("Failed to parse Phase 1 JSON. Raw LLM output:", text1);
      throw new Error("模型生成的剧情结构数据不完整或格式异常，可能是响应被中断，请重试。");
    }

    // 第二步：将提取出的原始资产名称映射到已知资产库
    const assets = listAssets({ scriptId });
    const characterNames = assets.filter(a => a.type === 'character').map(a => a.name);
    const sceneNames = assets.filter(a => a.type === 'scene').map(a => a.name);
    const propNames = assets.filter(a => a.type === 'prop').map(a => a.name);

    const assetContext = `
已知角色列表（必须精确使用这些名称）：${characterNames.join('、') || '暂无'}
已知场景列表（必须精确使用这些名称）：${sceneNames.join('、') || '暂无'}
已知道具列表（必须精确使用这些名称）：${propNames.join('、') || '暂无'}
`;

    const userPrompt2 = `${assetContext}\n\n请将以下原始分镜数据中的资产名词映射到上述已知资产库中：\n\n${JSON.stringify(parsed1, null, 2)}`;

    let text2 = await generateText({
      systemPrompt: SYSTEM_PROMPT_2,
      userPrompt: userPrompt2,
      forceJson: true,
    });

    if (text2.startsWith('```')) {
      const match = text2.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) text2 = match[1];
    }

    let parsed2;
    try {
      parsed2 = JSON.parse(text2);
    } catch (e) {
      console.error("Failed to parse Phase 2 JSON. Raw LLM output:", text2);
      throw new Error("模型生成的资产映射数据异常，请重试。");
    }

    // 合并第一步的结构和第二步的映射结果
    const groupMap = new Map(parsed2.groups?.map((g: any) => [g.id, g.sceneName]) || []);
    const shotMap = new Map(parsed2.shots?.map((s: any) => [s.id, { characters: s.characters || [], props: s.props || [] }]) || []);

    const groups = parsed1.groups.map((g: any, gIdx: number) => {
      const gId = g.id || `g${gIdx + 1}`;
      return {
        id: gId,
        title: g.title,
        context: g.context,
        sceneName: groupMap.get(gId) || '',
        shots: g.shots.map((s: any, sIdx: number) => {
          const sId = s.id || `s${gIdx + 1}-${sIdx + 1}`;
          const shotMapping = shotMap.get(sId) || { characters: [], props: [] };
          return {
            id: sId,
            visual: s.visual,
            speaker: s.speaker || '',
            dialogue: s.dialogue || '',
            characters: shotMapping.characters,
            props: shotMapping.props,
            firstFramePrompt: '',
            lastFramePrompt: '',
            videoPrompt: '',
            status: 'pending',
          };
        })
      };
    });

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
