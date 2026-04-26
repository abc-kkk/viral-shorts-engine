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

const ANALYZE_SYSTEM_PROMPT = `你是一位专业的短剧剧本分析师。你的任务是从剧本中提取所有角色、场景和道具信息。

请严格按照以下 JSON 格式输出，不要输出任何其他内容：

{
  "characters": [
    {
      "name": "角色名",
      "appearance": "外观描述（年龄、身材、穿着等，尽量详细）",
      "personality": "性格特征",
      "background": "背景故事",
      "relationships": "与其他角色的关系描述",
      "gender": "性别",
      "age": "年龄段",
      "occupation": "职业"
    }
  ],
  "scenes": [
    {
      "name": "场景名",
      "atmosphere": "氛围描述",
      "imagePrompt": "场景画面描述（用于AI生成图片的提示词，要详细描述环境、光影、色调，英文）",
      "timeOfDay": "时间（如：早晨/午后/黄昏/夜晚）",
      "weather": "天气（如：晴天/阴天/雨天，无则留空）"
    }
  ],
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
1. 角色：提取剧本中所有有台词或被提及的角色，即使只有一句台词也要提取
2. 场景：按剧本中出现的每一场戏/地点分别提取，注意不要遗漏
3. 道具：提取剧本中明确提到的关键道具、物品，包括角色使用的物品、重要道具
4. imagePrompt 必须用英文，描述要足够详细，能直接用于 AI 图片生成
5. 只输出 JSON，不要有任何多余文字`;

/** POST /api/studio/scripts/[id]/analyze */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 检查剧本是否存在
    const script = getScriptById(id);
    if (!script) {
      return NextResponse.json({ success: false, error: '剧本不存在' }, { status: 404 });
    }

    if (!script.content?.trim()) {
      return NextResponse.json({ success: false, error: '剧本内容为空，无法分析' }, { status: 400 });
    }

    // 更新状态为 analyzing
    updateScript(id, { status: 'analyzing' });

    // 调用 AI Gateway 分析剧本
    let analysis: FsScriptAnalysis;
    try {
      const userPrompt = `请分析以下短剧剧本，提取所有角色、场景和道具：\n\n---\n${script.content}\n---`;

      const gatewayRes = await fetch(`${AI_GATEWAY_URL}/api/text/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: ANALYZE_SYSTEM_PROMPT,
          userPrompt,
          forceJson: true,
        }),
      });

      if (!gatewayRes.ok) {
        const errText = await gatewayRes.text();
        throw new Error(`AI Gateway 返回错误 (${gatewayRes.status}): ${errText}`);
      }

      const gatewayData = await gatewayRes.json();
      const rawText: string = gatewayData.text || '';

      // 尝试解析 JSON（AI 可能返回 markdown 包裹的 JSON）
      let jsonStr = rawText.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      analysis = JSON.parse(jsonStr);

      // 校验基本结构
      if (!analysis.characters || !Array.isArray(analysis.characters)) {
        throw new Error('AI 返回的分析结果缺少 characters 数组');
      }
      if (!analysis.scenes || !Array.isArray(analysis.scenes)) {
        analysis.scenes = [];
      }
      if (!analysis.props || !Array.isArray(analysis.props)) {
        analysis.props = [];
      }

      console.log(`[Studio Analyze] AI extracted: ${analysis.characters.length} characters, ${analysis.scenes.length} scenes, ${analysis.props.length} props`);

    } catch (aiError: any) {
      // AI Gateway 失败，恢复状态
      updateScript(id, { status: 'draft' });
      console.error('[Studio Analyze] AI Gateway error:', aiError);
      return NextResponse.json(
        { success: false, error: `AI 分析失败: ${aiError.message}` },
        { status: 502 }
      );
    }

    // 从分析结果批量创建资产
    const created = createAssetsFromAnalysis(id, analysis);

    // 更新剧本状态为 ready
    updateScript(id, { status: 'ready' });

    return NextResponse.json({
      success: true,
      analysis,
      created,
      count: created.length,
    });
  } catch (e: any) {
    // 恢复剧本状态
    try {
      const { id: errId } = await params;
      if (errId) updateScript(errId, { status: 'draft' });
    } catch {}
    console.error('[Studio Analyze] Error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
