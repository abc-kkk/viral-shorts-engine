/**
 * Freedom Studio — 分镜提示词生成
 *
 * POST /api/studio/scripts/[id]/generate-shot-prompts
 *
 * 为指定镜头生成 firstFramePrompt / lastFramePrompt / videoPrompt
 * 参考剧本全文 + 镜头画面描述 + 上下文 + 角色/场景资产信息
 */
import { NextRequest, NextResponse } from 'next/server';
import { getScriptById, listAssets } from '@/lib/studio/db';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:4100';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { shotVisual, shotDialogue, groupContext, groupTitle, characters: shotCharacters, sceneName } = body;

    const script = getScriptById(id);
    if (!script) return NextResponse.json({ error: '剧本不存在' }, { status: 404 });

    // 获取资产上下文
    const assets = listAssets({ scriptId: id });
    const charAssets = assets.filter(a => a.type === 'character');
    const sceneAssets = assets.filter(a => a.type === 'scene');

    const charContext = (shotCharacters || []).map((name: string) => {
      const asset = charAssets.find(a => a.name === name);
      if (!asset) return `${name}`;
      const data = JSON.parse(typeof asset.data === 'string' ? asset.data : JSON.stringify(asset.data));
      return `${name}（${data.appearance || asset.description || ''}）`;
    }).join('\n');

    const sceneContext = sceneName
      ? (() => {
          const sa = sceneAssets.find(a => a.name === sceneName);
          if (!sa) return `场景：${sceneName}`;
          const data = JSON.parse(typeof sa.data === 'string' ? sa.data : JSON.stringify(sa.data));
          return `场景：${sceneName} — ${data.atmosphere || sa.description || ''}`;
        })()
      : '';

    const systemPrompt = `你是一位专业的短剧分镜提示词专家。你的任务是为一个具体镜头编写视觉提示词。

你必须使用 {@角色名} 语法引用角色图片，用 {@场景名} 引用场景图。这些标签会在后续被替换为实际图片引用。

请严格返回 JSON：
{
  "firstFramePrompt": "首帧提示词（中文，描述视频开始瞬间的静止画面）",
  "lastFramePrompt": "尾帧提示词（中文，描述视频结束瞬间的静止画面）",
  "videoPrompt": "视频动态提示词（中文，描述从首帧到尾帧的动作、运镜、口播）"
}

规则：
1. 首帧/尾帧提示词必须以"在 {@场景名} 中，"开头。你必须且只能使用【指定场景名称】中提供的精确名称（例如：如果指定场景是"苏家别墅"，你必须写 {@苏家别墅}，绝不能自己编造或修改名字）。
2. 在 首帧/尾帧提示词 中，每个出现的角色必须用 {@角色名} 引用。
3. ⚠️绝对禁止⚠️：在 videoPrompt（视频动态提示词）中，绝不能使用任何 {@角色名} 或 {@场景名} 标签。因为视频生成引擎不支持这种格式，直接用纯文本描述角色和场景即可。
4. 画面描述要足够详细，包含景别、人物位置、表情、动作、光线
4. videoPrompt 描述的是从首帧到尾帧的完整动态过程
5. 【重要】短剧中常见的冲突动作（如打人、扇耳光、愤怒指着镜头、杀意等）极易触发底层 AI 生图引擎的“安全审查/违规拦截”。你必须将这些动作转化为温和、中性但有张力的描述。例如：把“愤怒地指着镜头”改为“神情严肃地向前伸出手示意”；把“打人”改为“情绪激动地挥舞手臂”。绝对不要使用任何可能被误判为暴力、色情或危险的词汇。
6. 不要输出任何 JSON 以外的内容`;

    const userPrompt = `请为以下镜头生成视觉提示词：

【镜头组】${groupTitle}
【镜头组上下文】${groupContext}
【画面描述】${shotVisual}
【台词/旁白】${shotDialogue || '（无台词）'}

【涉及角色】
${charContext || '（无角色信息）'}

【指定场景名称】
${sceneName || '未指定场景'}

【场景细节信息】
${sceneContext || '（无场景信息）'}

【剧本全文（供理解上下文）】
${script.content?.substring(0, 3000) || '（空）'}
`;

    const res = await fetch(`${AI_GATEWAY_URL}/api/text/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, userPrompt, forceJson: true }),
    });

    if (!res.ok) throw new Error(`AI Gateway Error: ${await res.text()}`);

    const data = await res.json();
    let text = (data.text || '').trim();

    // Clean markdown
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) text = jsonMatch[1];

    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) throw new Error('AI 返回格式异常');

    const result = JSON.parse(text.substring(startIdx, endIdx + 1));

    return NextResponse.json({
      firstFramePrompt: result.firstFramePrompt || '',
      lastFramePrompt: result.lastFramePrompt || '',
      videoPrompt: result.videoPrompt || '',
    });
  } catch (error: any) {
    console.error('Failed to generate shot prompts:', error);
    return NextResponse.json({ error: error.message || '内部错误' }, { status: 500 });
  }
}
