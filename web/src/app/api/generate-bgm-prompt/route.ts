import { NextResponse } from 'next/server';
import { getTemplate } from '@/lib/prompts/promptStore';
import { renderTemplate } from '@/lib/prompts/templateEngine';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:4100';

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

    console.log(`🚀 [BGM Gen] 正在通过 AI Gateway 生成 BGM 提示词...`);
    const gatewayRes = await fetch(`${AI_GATEWAY_URL}/api/text/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        systemPrompt: template.systemPrompt || '', 
        userPrompt, 
        forceJson: false,
        provider: 'minimax' 
      }),
    });
    
    if (!gatewayRes.ok) {
      const errBody = await gatewayRes.json().catch(() => ({ error: `Gateway returned ${gatewayRes.status}` }));
      throw new Error(`AI Gateway Error: ${errBody.error}`);
    }
    
    const gatewayData = await gatewayRes.json();
    let resultText = gatewayData.text || '';
    
    // Clean up if it outputs think blocks from M2.7
    resultText = resultText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    return NextResponse.json({ prompt: resultText });

  } catch (err: any) {
    console.error("BGM Prompt Gen Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
