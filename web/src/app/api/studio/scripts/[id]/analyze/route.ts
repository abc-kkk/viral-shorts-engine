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

const CHAR_PROMPT = `你是一位专业的短剧剧本分析师与 AI 绘图提示词专家。你的任务是从剧本中提取【角色】信息，并为其撰写极度详细的视觉描述。
请严格按照以下 JSON 格式输出，不要输出任何其他内容：
{
  "characters": [
    {
      "name": "角色名",
      "appearance": "【极其重要】不要简单概括！必须按照以下维度详细扩写：1.面部与五官(眼型/眉型/嘴唇/妆容等)；2.发型与发饰；3.服饰(形制/颜色/材质/内外层次)；4.体态(强调双肩平直/正视前方/双手自然下垂)。语言必须具体可视化，多用颜色和材质名词，禁用纯文学比喻或动态词汇（如飘逸、摇曳）。",
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
2. 角色表情与道具过滤（极其重要）：外貌（appearance）描述中【绝对不能】包含角色的瞬时情绪或动作（如微笑等），也【绝对不能】包含任何武器、法器、手持道具（如剑、刀、扇子、包等）。必须且只能提取固定的、绝对中性的物理特征和穿搭。
3. 群体角色拆分：如果出现群体角色（如“两个保镖”），必须提取为单数概念（如“保镖A”），绝对不能合并为一个角色资产。
4. 视觉描述扩写：根据角色的身份和性格，为其扩写出符合真实人类和写实风格的服饰穿搭与外貌细节。`;

const SCENE_PROMPT = `你是一位专业的短剧剧本分析师与“电影级纯净场景设计专家（高辨识度版）”。你的任务是从剧本中提取所有【场景】信息。
请严格按照以下 JSON 格式输出，不要输出任何其他内容：
{
  "scenes": [
    {
      "name": "场景名（必须在四个字以上，通过具体的修饰词增加辨识度，严禁使用单一名词。且绝对唯一）",
      "atmosphere": "空间氛围描述（如宁静、温馨等，严禁使用破败、压抑、混乱等词）",
      "imagePrompt": "不能出现其他人，无人，纯场景，无打斗无破坏无废墟，[融合环境类型、具体时间、空间氛围、主要特征的一段精简的英文生图描述词，必须包含: no humans, empty, landscape only, intact, no damage, no battle, no debris]",
      "timeOfDay": "精确的时间（早晨/午后/黄昏/夜晚）",
      "weather": "天气（晴天/阴天/雨天，无则留空）"
    }
  ]
}

【核心执行逻辑】：
1. 绝对真空与匿名：画面中严禁出现任何人影，场景描述文字(imagePrompt)中严禁出现任何角色人名。
2. 绝对纯净与完好：场景必须呈现整洁、完好、无破坏的状态。严禁出现打斗痕迹、废墟、血迹、碎片、爆炸、烟雾、混乱动态等元素。（除非小说明确描述出破损）。
3. 场景命名法则：每个场景名称必须在【四个字以上】（如“昆仑神殿主殿”、“苏氏总裁办公室”）。
4. Prompt 强制控制：imagePrompt 必须严格以 “不能出现其他人，无人，纯场景，无打斗无破坏无废墟，” 开头。后面跟上具体的英文环境描述。`;

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
