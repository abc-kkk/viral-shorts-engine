import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:4100';

interface GenerateTextOptions {
  systemPrompt: string;
  userPrompt: string;
  forceJson?: boolean;
}

export async function generateText({ systemPrompt, userPrompt, forceJson = false }: GenerateTextOptions): Promise<string> {
  // Read global settings from database
  const db = getDb();
  const rows = db.select().from(schema.systemStates).all();
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  const provider = settings.aiProvider || 'gemini';
  const minimaxApiKey = settings.minimaxApiKey || process.env.MINIMAX_API_KEY || '';

  console.log(`\n======================================`);
  console.log(`🚀 [LLM] 开始生成内容... 提供商: ${provider}`);
  console.log(`======================================`);

  if (provider === 'minimax') {
    if (!minimaxApiKey) {
      throw new Error('未配置 MiniMax API Key，请在系统设置中配置。');
    }

    const res = await fetch('https://api.minimaxi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${minimaxApiKey}`
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        messages: [
          { role: 'system', name: 'system', content: systemPrompt },
          { role: 'user', name: 'user', content: userPrompt }
        ],
        stream: true
      })
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`MiniMax API 错误: ${errBody}`);
    }

    if (!res.body) {
      throw new Error('MiniMax API 错误: 未返回任何内容流');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let contentBuffer = '';
    
    let printedHeader = false;
    let hasEndedThink = false;
    let thinkTextStreamed = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkStr = decoder.decode(value, { stream: true });
      const lines = chunkStr.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          try {
            const data = JSON.parse(line.slice(6));
            const deltaContent = data.choices?.[0]?.delta?.content || '';
            contentBuffer += deltaContent;

            // 实时打印思考过程
            if (!hasEndedThink) {
              const thinkStartIdx = contentBuffer.indexOf('<think>');
              if (thinkStartIdx !== -1) {
                if (!printedHeader) {
                  console.log(`\n======================================`);
                  console.log(`🤔 [MiniMax] 思考过程 (实时输出):`);
                  console.log(`--------------------------------------`);
                  printedHeader = true;
                }

                const thinkEndIdx = contentBuffer.indexOf('</think>');
                let availableThinkText = '';
                
                if (thinkEndIdx !== -1) {
                  availableThinkText = contentBuffer.substring(thinkStartIdx + 7, thinkEndIdx);
                  hasEndedThink = true;
                } else {
                  availableThinkText = contentBuffer.substring(thinkStartIdx + 7);
                }

                const newTextToPrint = availableThinkText.substring(thinkTextStreamed);
                if (newTextToPrint.length > 0) {
                  process.stdout.write(newTextToPrint);
                  thinkTextStreamed += newTextToPrint.length;
                }

                if (hasEndedThink) {
                  console.log(`\n======================================\n`);
                }
              }
            }
          } catch (e) {
            // Ignore incomplete JSON chunks from split lines
          }
        }
      }
    }

    // 最终安全清理
    let finalContent = contentBuffer.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return finalContent;
  } else {
    // Gateway fallback (Gemini or Doubao)
    const gatewayRes = await fetch(`${AI_GATEWAY_URL}/api/text/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        forceJson,
        provider,
      }),
    });

    if (!gatewayRes.ok) {
      const errBody = await gatewayRes.json().catch(() => ({ error: `Gateway returned ${gatewayRes.status}` }));
      throw new Error(`AI Gateway Error: ${errBody.error}`);
    }

    const gatewayData = await gatewayRes.json();
    return gatewayData.text;
  }
}
