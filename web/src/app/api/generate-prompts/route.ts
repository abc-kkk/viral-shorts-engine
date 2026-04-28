import { NextResponse } from 'next/server';

import { getTemplate } from '@/lib/prompts/promptStore';
import { renderTemplate } from '@/lib/prompts/templateEngine';
import { generateText } from '@/lib/llm/generateText';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { aiProvider, taskType, theme, characterDetails, actionHint, dialogue, artStyle, fullScriptContext, characterName, allCharactersContext, creativeMode, userDirection, sceneIndex, totalScenes, previousImagePrompt, previousVideoPrompt, sheetElements, sceneComposition, sceneLocationContext, sceneLocationToken, startLayoutToken, endLayoutToken } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    // Map taskType to template ID
    const templateIdMap: Record<string, string> = {
      'script': 'script_v1',
      'script_v2': 'script_v2',
      'script_iterate': 'script_iterate',
      'script_review': 'script_review',
      'script_to_scenes': 'script_to_scenes',
      'publish_info': 'publish_info',
      'character_prompt': 'character_prompt',
      'location_prompt': 'location_prompt',
      'cover_prompt': 'cover_prompt',
      'action': 'action_prompt',
      'scene_image_refine': 'scene_image_refine_prompt',
      'scene_video_refine': 'scene_video_refine_prompt'
    };

    const templateId = templateIdMap[taskType];
    if (!templateId) {
        throw new Error("Invalid taskType provided: " + taskType);
    }

    const template = getTemplate(templateId);
    if (!template) {
        throw new Error("Template not found for ID: " + templateId);
    }

    // Build variables for rendering
    let variables: Record<string, string> = {
        theme: theme || '',
        artStyle: artStyle || '',
        scriptContext: fullScriptContext || '',
        characterName: characterName || '',
        characterDetails: characterDetails || '',
        allCharactersContext: allCharactersContext || '',
        actionHint: actionHint || '',
        dialogue: dialogue || '',
        sheetElements: sheetElements || '单人全身照（经典模式）',
        sceneComposition: sceneComposition || '无特殊要求，AI 自由发挥',
        sceneLocationContext: sceneLocationContext || '',
        sceneLocationToken: sceneLocationToken || '场景',
        startLayoutToken: startLayoutToken || '',
        endLayoutToken: endLayoutToken || '',
        anchorInstruction: `- **【极度致命：场景皮肉与站位骨架锚点约束】**\n   - 对于首帧(startImagePrompt)，你必须一字不差地以这句开头：\`${startLayoutToken ? `根据 {@${startLayoutToken}} 的人物站位比例，在 {@${sceneLocationToken || '场景'}} 中，...` : `在 {@${sceneLocationToken || '场景'}} 中，...`}\`\n   - 对于尾帧(imagePrompt)，你必须一字不差地以这句开头：\`${endLayoutToken ? `根据 {@${endLayoutToken}} 的人物站位比例，在 {@${sceneLocationToken || '场景'}} 中，...` : `在 {@${sceneLocationToken || '场景'}} 中，...`}\`\n   - 绝对不准自己发明背景词汇！即使上一镜使用了其他的场景标签（如 {@场景_S4}），本镜也必须严格使用本镜专属的 {@${sceneLocationToken || '场景'}}！`,
        sceneIndexPlusOne: (sceneIndex !== undefined ? sceneIndex + 1 : 1).toString(),
        totalScenes: (totalScenes || 1).toString(),
        speakerName: (actionHint === '字卡画面描述' || dialogue === '字卡上的文字') ? '字卡' : 'Character',
        rawScript: theme || '', // in iterate/review, theme is used as rawScript. Let's provide rawScript properly.
        userDirection: userDirection || '',
        creativeModeText: creativeMode === 'direct' ? '直接生成' : (creativeMode === 'adapt' ? '二创重构' : '仅限参考'),
        promptVersion: 'v2.0-三段式',
    };

    // Special handling for some variables
    if (taskType === 'script_iterate' || taskType === 'script_review' || taskType === 'script_to_scenes') {
        variables.rawScript = theme; // Original code passed rawScript via 'theme' parameter
    }
    
    // Special handling for script_v2 modeInstruction
    if (taskType === 'script_v2') {
        if (creativeMode === 'direct') {
            variables.modeInstruction = '请将以下「核心灵感梗」直接转化为符合上述要求的高共鸣治愈系短剧剧本。';
        } else if (creativeMode === 'adapt') {
            variables.modeInstruction = '请基于以下「素材痛点」进行二次创作，写出完全不同但同样具备治愈反转效果的新剧本。可以置换场景和角色，但要保持神级转折和强共鸣。';
        } else {
            variables.modeInstruction = '以下素材仅供参考其情绪内核和反转节奏，请写一个全新的、高度治愈且带轻喜剧色彩的短剧。';
        }
        variables.userDirectionText = userDirection ? (creativeMode === 'direct' || creativeMode === 'adapt' ? `【补充导演指示】：${userDirection}` : `【用户想看的故事】：${userDirection}`) : (creativeMode === 'reference' ? '请自由发挥一个让人看完眼眶一热又忍不住想笑的故事。' : '');
    }

    // Special handling for Action Prompt conditions
    if (taskType === 'action') {
        const isFirstScene = sceneIndex === 0;
        const isTitleCard = actionHint === '字卡画面描述' || dialogue === '字卡上的文字';
        
        variables.firstSceneRequirement = isFirstScene 
            ? '- "startImagePrompt": 该场景的【首帧】静态图提示词（中文）——描述视频开始时的画面状态\n- "imagePrompt": 该场景的【尾帧】静态图提示词（中文）——描述视频结束时的画面状态'
            : '- "imagePrompt": 该场景的【尾帧】静态图提示词（中文）——描述视频结束时的画面状态\n  （首帧会自动使用上一个场景的尾帧，你不需要生成）';
            
        variables.continuationRequirement = !isFirstScene
            ? `【场景连贯性（极其重要！）】\n这是第 ${sceneIndex + 1} 个镜头（共 ${totalScenes} 个）。你的首帧会自动使用上一个镜头的尾帧。\n因此你的 "imagePrompt"（本镜尾帧）和 "videoPrompt" 必须与上一个镜头的状态保持严格连贯！\n上一个镜头的提示词如下，请仔细阅读并确保人物状态、场景细节、道具位置的延续性：\n---\n上一镜尾帧提示词：${previousImagePrompt || '（无）'}\n上一镜视频提示词：${previousVideoPrompt || '（无）'}\n---\n你必须在 videoPrompt 开头明确声明"延续上一段视频的人物、空间与时间线"，并逐条复述关键场景元素（家具位置、人物穿着、发型状态、道具位置等），确保 AI 不遗忘任何细节。注意：如果上一镜使用了类似 {@场景_S4} 的标签，**请不要盲目复制**，本镜的开头必须严格遵守【场景皮肉与站位骨架锚点约束】中的标签要求！`
            : '';
            
        variables.titleCardStartPrompt = isFirstScene ? '"startImagePrompt": "纯黑色背景，画面中央无任何内容，静默等待文字出现。",' : '';
        variables.isFirstScenePrompt = isFirstScene ? '🔴 这是第一个镜头，你必须同时生成 startImagePrompt 和 imagePrompt！' : '这不是第一个镜头，首帧会自动使用上一镜尾帧，你只需生成 imagePrompt。';
        variables.previousContextPrompt = !isFirstScene 
            ? `\n【重要上下文：上一镜的尾帧画面（即本镜首帧状态）】\n${previousImagePrompt || 'N/A'}\n\n【上一镜的视频动作走向】\n${previousVideoPrompt || 'N/A'}\n\n👉 你的任务：请你务必基于上面的“上一镜尾帧画面”作为起点的状态，接着生成本镜头的“动态过程(videoPrompt)”和“最终结束画面(imagePrompt)”！`
            : '';
    }

    systemPrompt = renderTemplate(template.systemPrompt, variables);
    userPrompt = renderTemplate(template.userPrompt, variables);

    let resultText = "";

    const requiresJson = taskType !== 'script_v2' && taskType !== 'script_iterate' && taskType !== 'cover_prompt';
    
    resultText = await generateText({
      systemPrompt,
      userPrompt,
      forceJson: requiresJson
    });

    console.log("\n======================================");
    console.log(`✨ [LLM] 大模型返回完毕，正在解析...`);
    console.log("======================================");
    
    // JSON.parse bypass for raw text tasks
    const isRawTextMode = taskType === 'script_v2' || taskType === 'script_iterate' || taskType === 'cover_prompt';
    if (isRawTextMode) {
       return NextResponse.json(taskType === 'cover_prompt' ? { prompt: resultText.trim() } : { script: resultText.trim(), text: resultText.trim() });
    }

    const startIdx = resultText.indexOf("{");
    const endIdx = resultText.lastIndexOf("}");
    
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
        throw new Error("AI output was not valid JSON:\n" + resultText);
    }

    let rawJson = resultText.substring(startIdx, endIdx + 1);
    
    let resultObj;
    try {
      resultObj = JSON.parse(rawJson);
    } catch (initialErr) {
      // Clean trailing commas if MiniMax messed up
      rawJson = rawJson.replace(/,\s*([}\]])/g, '$1');
      // Escape unescaped newlines in dialogue
      rawJson = rawJson.replace(/\n/g, '\\n').replace(/\\n\s*}/g, '\n}').replace(/\\n\s*\]/g, '\n]').replace(/{\\n/g, '{\n').replace(/\[\\n/g, '[\n').replace(/,\\n/g, ',\n').replace(/":\\n/g, '":\n');
      try {
        resultObj = JSON.parse(rawJson);
      } catch (parseErr: any) {
        console.error("JSON PARSE ERROR on string:", rawJson);
        throw new Error(`剧本解析失败，AI 吐出的格式损坏: ${parseErr.message}`);
      }
    }
    
    return NextResponse.json(resultObj);

  } catch (err: any) {
    console.error("AI Generation Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
