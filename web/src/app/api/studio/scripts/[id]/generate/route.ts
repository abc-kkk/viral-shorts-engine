/**
 * Freedom Studio — AI 生成/润色剧本
 *
 * POST /api/studio/scripts/[id]/generate
 *
 * 支持两种模式：
 *   - generate: 用户写大概要求，AI 从零生成完整剧本
 *   - polish: 用户已有内容，AI 帮忙润色/扩写/改写
 *
 * 调用 AI Gateway 的 /api/text/generate 接口
 */
import { NextRequest, NextResponse } from 'next/server';
import { getScriptById, updateScript } from '@/lib/studio/db';
import { generateText } from '@/lib/llm/generateText';

/** 生成模式 */
type GenerateMode = 'generate' | 'polish';

interface GenerateBody {
  mode: GenerateMode;
  /** 用户的要求/大纲（generate 模式必填） */
  prompt: string;
  /** 类型偏好（如：喜剧、悬疑、爱情） */
  genre?: string;
  /** 集数 */
  episodeCount?: number;
}

// ---- System Prompts ----

const GENERATE_SYSTEM_PROMPT = `你是一位专业的短剧编剧。你的任务是根据用户提供的要求，创作一个完整的短剧剧本。

输出格式要求：
1. 剧本标题（第一行，用 # 标记）
2. 角色列表（用 ## 标记，每个角色包含：名字、年龄、性格、背景、与其他角色的关系）
3. 剧本正文（用 ## 标记每场戏，格式：场景名 + 时间 + 角色 + 台词/动作）

创作原则：
- 对话要自然口语化，符合角色性格
- 情节紧凑，有冲突有转折
- 每场戏有明确的场景描写
- 角色塑造鲜明，有记忆点

请直接输出剧本内容，不要有任何额外说明。`;

const POLISH_SYSTEM_PROMPT = `你是一位专业的短剧编剧和剧本编辑。你的任务是对用户已有的剧本进行润色和改进。

润色原则：
- 保持原剧本的核心情节和角色关系不变
- 优化对话，使其更自然、更有戏剧张力
- 补充场景描写，使画面感更强
- 修正逻辑漏洞和不合理之处
- 如果用户有具体修改要求，优先按用户要求修改

请直接输出润色后的完整剧本内容，不要有任何额外说明。`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: GenerateBody = await req.json();
    const { mode, prompt, genre, episodeCount } = body;

    if (!prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: '请输入你的要求或大纲' },
        { status: 400 }
      );
    }

    const script = getScriptById(id);
    if (!script) {
      return NextResponse.json(
        { success: false, error: '剧本不存在' },
        { status: 404 }
      );
    }

    // 标记为生成中
    updateScript(id, { status: 'analyzing' });

    const systemPrompt = mode === 'polish' ? POLISH_SYSTEM_PROMPT : GENERATE_SYSTEM_PROMPT;

    let userPrompt = '';

    if (mode === 'generate') {
      // 从零生成
      userPrompt = `请根据以下要求创作一个短剧剧本：\n\n${prompt.trim()}`;
      if (genre) userPrompt += `\n\n类型：${genre}`;
      if (episodeCount) userPrompt += `\n集数：${episodeCount}集`;
    } else {
      // 润色已有内容
      userPrompt = `以下是我的剧本，请帮我润色改进：\n\n---\n${script.content || '(暂无内容)'}\n---\n\n我的修改要求：${prompt.trim()}`;
    }

    // 调用 AI Gateway
    let generatedContent: string;

    try {
      generatedContent = await generateText({
        systemPrompt,
        userPrompt,
        forceJson: false,
      });

      if (!generatedContent.trim()) {
        throw new Error('AI 返回了空内容');
      }
    } catch (aiError: any) {
      // AI Gateway 不可用时，恢复状态并报错
      updateScript(id, { status: 'draft' });
      console.error('[Studio API] AI Gateway error:', aiError);
      return NextResponse.json(
        { success: false, error: `AI 生成失败: ${aiError.message}` },
        { status: 502 }
      );
    }

    // 更新剧本内容
    const updatedScript = updateScript(id, {
      content: generatedContent,
      status: 'draft',
      source: mode === 'generate' ? 'ai_generated' : script.source,
      genre: genre || script.genre,
      episodeCount: episodeCount || script.episodeCount,
    });

    return NextResponse.json({
      success: true,
      script: updatedScript,
      generatedContent,
    });
  } catch (e: any) {
    console.error('[Studio API] POST /scripts/[id]/generate error:', e);
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    );
  }
}
