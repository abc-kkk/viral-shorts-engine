/**
 * Freedom Studio — AI 分析剧本提取资产
 *
 * POST /api/studio/scripts/[id]/analyze
 *
 * 自动读取剧本内容 → 调 AI Gateway 分析 → 提取角色/场景/道具
 */
import { NextRequest, NextResponse } from 'next/server';
import { getScriptById, updateScript, createAssetsFromAnalysis } from '@/lib/studio/db';
import type { FsScriptAnalysis } from '@/lib/studio/types';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:4100';

type RouteParams = { params: Promise<{ id: string }> };

const CHAR_PROMPT = `你是一位专业的短剧剧本分析师。你的任务是专门从剧本中提取所有【角色】信息。
请严格按照以下 JSON 格式输出，不要输出任何其他内容：
{
  "characters": [
    {
      "name": "角色名",
      "appearance": "外观描述（年龄、身材、穿着等）",
      "personality": "性格特征",
      "background": "背景故事",
      "relationships": "与其他角色的关系描述",
      "gender": "性别",
      "age": "年龄段",
      "occupation": "职业"
    }
  ]
}

提取原则：
1. 提取所有有台词或被提及的角色，即使只有一句台词也要提取。
2. 角色表情过滤（极其重要）：外貌（appearance）描述中【绝对不能】包含角色的瞬时情绪或动作（如眉头紧锁、微笑等）。提取固定的、中性的基础物理特征（五官、发型、日常穿着）。
3. 群体角色拆分：如果出现群体角色（如“两个保镖”），必须提取为单数概念（如“保镖A”），绝对不能合并为一个角色资产。`;

const SCENE_PROMPT = `你是一位专业的短剧剧本分析师。你的任务是专门从剧本中提取所有【场景】信息。
请严格按照以下 JSON 格式输出，不要输出任何其他内容：
{
  "scenes": [
    {
      "name": "场景名（必须唯一且具体）",
      "atmosphere": "氛围描述",
      "imagePrompt": "场景画面描述（用于AI生成图片的提示词，英文，详细描述环境、光影、色调）",
      "timeOfDay": "时间（早晨/午后/黄昏/夜晚）",
      "weather": "天气（晴天/阴天/雨天，无则留空）"
    }
  ]
}

提取原则：
1. 按剧本中出现的每一场戏/地点分别提取，注意不要遗漏。
2. 场景命名（极其重要）：每个场景的 name 必须【唯一且具有辨识度】，使用「地点 + 具体位置」的格式。例如：不能只叫"办公室"，应该叫"苏氏集团总裁办公室"；不能只叫"街道"，应该叫"老城区步行街"；不能只叫"医院"，应该叫"市中心医院急诊室"。绝不允许任何两个场景有相同的 name。
3. 场景的 imagePrompt 必须用英文写，描述要能直接用于 AI 图片生成。`;

const PROP_PROMPT = `你是一位专业的短剧剧本分析师。你的任务是专门从剧本中提取所有关键【道具】信息。
请严格按照以下 JSON 格式输出，不要输出任何其他内容：
{
  "props": [
    {
      "name": "道具名",
      "category": "分类（weapon/accessory/vehicle/tool/consumable/decoration/other）",
      "imagePrompt": "道具外观描述（用于AI生成图片的提示词，英文）",
      "sizeDescription": "大小描述",
      "heldBy": "由哪个角色持有或使用"
    }
  ]
}

提取原则：
1. 提取剧本中明确提到的关键道具、物品，包括角色使用的物品。
2. imagePrompt 必须用英文。`;

async function fetchAnalysisTask(systemPrompt: string, scriptContent: string) {
  const userPrompt = `请分析以下短剧剧本，提取相关信息：\n\n---\n${scriptContent}\n---`;
  const res = await fetch(`${AI_GATEWAY_URL}/api/text/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt,
      userPrompt,
      forceJson: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`AI Gateway Error: ${await res.text()}`);
  }

  const data = await res.json();
  let jsonStr = (data.text || '').trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  return JSON.parse(jsonStr);
}

/** POST /api/studio/scripts/[id]/analyze?category=character|scene|prop */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const category = req.nextUrl.searchParams.get('category') as 'character' | 'scene' | 'prop' | null;

    const script = getScriptById(id);
    if (!script) return NextResponse.json({ success: false, error: '剧本不存在' }, { status: 404 });
    if (!script.content?.trim()) return NextResponse.json({ success: false, error: '剧本内容为空' }, { status: 400 });

    updateScript(id, { status: 'analyzing' });

    let analysis: FsScriptAnalysis = { characters: [], scenes: [], props: [] };
    
    try {
      if (category === 'character') {
        const data = await fetchAnalysisTask(CHAR_PROMPT, script.content);
        if (data.characters && Array.isArray(data.characters)) analysis.characters = data.characters;
      } else if (category === 'scene') {
        const data = await fetchAnalysisTask(SCENE_PROMPT, script.content);
        if (data.scenes && Array.isArray(data.scenes)) analysis.scenes = data.scenes;
      } else if (category === 'prop') {
        const data = await fetchAnalysisTask(PROP_PROMPT, script.content);
        if (data.props && Array.isArray(data.props)) analysis.props = data.props;
      } else {
        // 无 category 参数 → 并行发起全部 3 个任务
        const [charsData, scenesData, propsData] = await Promise.all([
          fetchAnalysisTask(CHAR_PROMPT, script.content),
          fetchAnalysisTask(SCENE_PROMPT, script.content),
          fetchAnalysisTask(PROP_PROMPT, script.content)
        ]);
        if (charsData.characters && Array.isArray(charsData.characters)) analysis.characters = charsData.characters;
        if (scenesData.scenes && Array.isArray(scenesData.scenes)) analysis.scenes = scenesData.scenes;
        if (propsData.props && Array.isArray(propsData.props)) analysis.props = propsData.props;
      }

      console.log(`[Studio Analyze] Extracted (category=${category || 'all'}): ${analysis.characters.length} chars, ${analysis.scenes.length} scenes, ${analysis.props.length} props`);

    } catch (aiError: any) {
      updateScript(id, { status: 'draft' });
      console.error('[Studio Analyze] AI Gateway error:', aiError);
      return NextResponse.json({ success: false, error: `AI 分析失败: ${aiError.message}` }, { status: 502 });
    }

    const created = createAssetsFromAnalysis(id, analysis);
    updateScript(id, { status: 'ready' });

    return NextResponse.json({ success: true, analysis, created, count: created.length });
  } catch (e: any) {
    try {
      const { id: errId } = await params;
      if (errId) updateScript(errId, { status: 'draft' });
    } catch {}
    console.error('[Studio Analyze] Error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
