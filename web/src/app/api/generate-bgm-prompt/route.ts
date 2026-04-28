import { NextResponse } from 'next/server';
import { getTemplate } from '@/lib/prompts/promptStore';
import { renderTemplate } from '@/lib/prompts/templateEngine';
import { generateText } from '@/lib/llm/generateText';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { theme } = await req.json();

    const template = getTemplate('bgm_prompt');
    if (!template) {
        throw new Error("Template not found for ID: bgm_prompt");
    }

    const variables = {
        theme: theme || 'Random highly energetic, cute, bouncy dance track'
    };

    const userPrompt = renderTemplate(template.userPrompt, variables);

    console.log(`🚀 [BGM Gen] 正在生成 BGM 提示词...`);
    let resultText = await generateText({
        systemPrompt: template.systemPrompt || '',
        userPrompt,
        forceJson: false
    });
    
    // Clean up if it outputs think blocks from M2.7
    resultText = resultText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    return NextResponse.json({ prompt: resultText });

  } catch (err: any) {
    console.error("BGM Prompt Gen Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
