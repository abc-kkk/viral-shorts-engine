import { NextRequest, NextResponse } from 'next/server';
import { getScriptById, updateScript, listAssets } from '@/lib/studio/db';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:4100';

const SYSTEM_PROMPT = `
你是一位专业的电影分镜师。请阅读以下短剧剧本，并将其结构化地拆解为【镜头组（场景）】和具体的【镜头（Shot）】。

规则：
1. "镜头组" (Camera Group) 对应剧本中的一个个具体的物理场景或大的段落。
2. 每个镜头组包含一个 "标题" (title) 和一个简短的 "背景/空间/时间/动作" 描述 (context)。
3. 每个镜头组内包含多个连续的 "镜头" (shots)。
4. 每个镜头必须包含：
   - "visual" (画面描述，包含景别、视角、画面主体动作)
   - "dialogue" (台词/旁白，如果没有则为空字符串)
   - "speaker" (说话的角色名，如果没有则为空字符串，或者是"旁白")
   - "characters" (出现在该镜头中的角色名列表，如 ["林辰", "苏若雪"])
   - "firstFramePrompt" (首帧图的中文视觉提示词，描述视频开始瞬间的静止画面，要用 {@角色名} 语法引用角色图片，用 {@场景名} 引用场景图)
   - "lastFramePrompt" (尾帧图的中文视觉提示词，描述视频结束瞬间的静止画面，同样使用 {@} 语法引用)
   - "videoPrompt" (视频动态提示词，描述从首帧到尾帧之间的完整动态过程、运镜和口播)
5. 【重要】当前剧本的美术设定为：{{ART_STYLE}}。请确保所有的 "firstFramePrompt" 和 "lastFramePrompt" 中，明确包含能够体现该风格设定的核心提示词（例如 3D渲染、皮克斯风格、或者真实摄影等），确保生成的画面风格一致。
6. 必须返回纯 JSON 格式，严格遵循以下结构，不要有任何额外的文本或 Markdown 标记。

关于 {@} 引用语法的严格规则：
- 当提示词中需要某个角色出现时，必须使用 {@角色名} 来引用，例如 {@林辰}、{@苏若雪}
- 当提示词中需要使用某个场景作为背景时，必须使用 {@场景名} 来引用，例如 {@苏氏集团总裁办公室}
- 这些标签会在后续处理中被替换为实际的图片引用，确保生成一致性

JSON 结构示例：
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
          "visual": "全景，男主愤怒地推开办公室大门，反派坐在宽大的办公桌后冷笑。",
          "speaker": "赵天霸",
          "dialogue": "（冷笑）你终于来了。",
          "characters": ["林辰", "赵天霸"],
          "firstFramePrompt": "在 {@苏氏集团总裁办公室} 中，{@林辰} 站在紧闭的办公室大门前，右手握住门把手，面部特写，眼神坚定。{@赵天霸} 坐在远处的宽大办公桌后，双手交叉，面带冷笑。画面构图强调纵深感。",
          "lastFramePrompt": "在 {@苏氏集团总裁办公室} 中，{@林辰} 已经大步迈入办公室内，站在办公桌前方，双脚分开与肩同宽，正面对峙。{@赵天霸} 从椅子上微微前倾，双眼眯起。整体氛围紧张。",
          "videoPrompt": "延续首帧画面。{@林辰} 猛地推开大门（推门声效），大步走入办公室，镜头跟随其脚步从门口推至办公桌前。{@赵天霸} 保持坐姿但表情从轻蔑变为微怒。运镜：从门口中景跟拍至桌前近景。"
        }
      ]
    }
  ]
}

注意：
- 必须从已知的角色和场景名称列表中选择 {@} 引用的名字，确保名称精确匹配。
- 提取的结果要尽可能覆盖剧本的全部重要情节。
- 每个镜头的画面描述和提示词要足够详细。
- JSON 必须是合法的。
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
    
    const artStyle = (script.metadata as any)?.artStyle || "极度写实，手机实拍感，自然光影";
    const systemPrompt = SYSTEM_PROMPT.replace('{{ART_STYLE}}', artStyle);

    const userPrompt = `${assetContext}\n请分析以下短剧剧本，提取分镜：\n\n---\n${script.content}\n---`;
    
    const res = await fetch(`${AI_GATEWAY_URL}/api/text/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: systemPrompt,
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
    
    // Ensure status fields are added
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
        firstFramePrompt: s.firstFramePrompt || '',
        lastFramePrompt: s.lastFramePrompt || '',
        videoPrompt: s.videoPrompt || '',
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
