import { NextResponse } from 'next/server';
import { getAssetDir } from '@/lib/db';
import { generateAssetFilename, getAssetTypeForTarget, getAssetUrlWithCacheBust } from '@/lib/assetUrl';
import type { TargetType } from '@/lib/types';
import { PassthroughMetaSchema } from '@/lib/validation';
import { resolveFlowUrl } from '@/lib/detectFlowUrl';
import fs from 'fs';
import path from 'path';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:4100';

export async function POST(req: Request) {
  try {
    const { prompt, model, referenceKeyword, referenceKeywords, startImageUrl, flowUrl: rawFlowUrl, projectId, fireAndForget, veoMode, targetType: reqTargetType, index: reqIndex, meta: reqMeta } = await req.json();

    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });

    // 自动探测 Flow URL（Chrome CDP → 全局设置 → 环境变量）
    const flowUrl = await resolveFlowUrl(rawFlowUrl);
    if (!flowUrl) {
      return NextResponse.json({ error: '未找到 Flow URL。请在调试 Chrome 中打开 Flow 页面，或在「系统设置」中手动配置。' }, { status: 400 });
    }
    console.log(`[Asset Gen] Using Flow URL: ${flowUrl.substring(0, 60)}...`);

    // --- Zod 强类型校验 ---
    const validationResult = PassthroughMetaSchema.safeParse({
        targetType: reqTargetType,
        index: reqIndex,
        meta: reqMeta
    });

    if (!validationResult.success) {
        console.error('[Asset Gen] Invalid passthrough meta:', validationResult.error.format());
        return NextResponse.json({ error: 'Invalid passthrough meta parameters', details: validationResult.error.format() }, { status: 400 });
    }
    
    // 使用校验后清洗过的值
    const validMeta = validationResult.data;

    const targetModel = model || 'Veo 3.1';
    console.log(`[Asset Gen] [${projectId}] Requesting ${targetModel} for: "${prompt.substring(0, 30)}..." (FireAndForget: ${fireAndForget})`);
    
    let keywords: string[] = [];
    if (referenceKeywords && Array.isArray(referenceKeywords)) {
        keywords = referenceKeywords;
    } else if (referenceKeyword) {
        keywords = [referenceKeyword];
    } else if (startImageUrl) {
        keywords = [startImageUrl];
    }
    
    if (keywords.length > 0) {
       console.log(`[Asset Gen] Injecting ${keywords.length} reference keyword(s)...`);
    }
    
    // 通过 HTTP 调用 ai-gateway 的媒体生成端点
    const gatewayRes = await fetch(`${AI_GATEWAY_URL}/api/media/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: targetModel, referenceKeywords: keywords, flowUrl, fireAndForget, veoMode, passthroughMeta: validMeta }),
    });
    
    if (!gatewayRes.ok) {
      const errBody = await gatewayRes.json().catch(() => ({ error: `Gateway returned ${gatewayRes.status}` }));
      throw new Error(`AI Gateway Error: ${errBody.error}`);
    }
    
    const result = await gatewayRes.json();
    
    if (!result.success) {
      throw new Error(result.error || 'AI Gateway Flow Automator Failed');
    }

    if (result.fireAndForget) {
        return NextResponse.json({ success: true, fireAndForget: true, message: '指令已下达，转交人工使用插件拾取' });
    }

    if (!result.url) {
      throw new Error('AI Gateway Flow Automator Failed: No media url returned.');
    }

    // DOWNLOAD TO LOCAL — 使用统一的资源工具函数
    let finalUrl = result.url;
    try {
        const mediaType = targetModel === 'Veo 3.1' ? 'video' : 'image';
        
        let targetType: TargetType = reqTargetType || (mediaType === 'video' ? 'sceneVideo' : 'sceneImage');
        let ctxIndex: number | undefined = reqIndex;
        let ctxMeta: Record<string, any> | undefined = reqMeta;
        
        // Use passthroughMeta if returned by gateway (extra safety)
        if (result.passthroughMeta) {
            if (result.passthroughMeta.targetType) targetType = result.passthroughMeta.targetType;
            if (result.passthroughMeta.index !== undefined) ctxIndex = result.passthroughMeta.index;
            if (result.passthroughMeta.meta !== undefined) ctxMeta = result.passthroughMeta.meta;
        }
        
        const assetType = getAssetTypeForTarget(targetType, mediaType);
        const assetsDir = getAssetDir(projectId, assetType);
        const filename = generateAssetFilename(targetType, projectId, ctxIndex, ctxMeta, mediaType);
        
        console.log(`[Asset Gen] Downloading to ${assetType}/ for 0-buffer playback...`);
        const assetRes = await fetch(result.url);
        if (assetRes.ok) {
            const arrayBuffer = await assetRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            const filepath = path.join(assetsDir, filename);
            fs.writeFileSync(filepath, buffer);
            finalUrl = getAssetUrlWithCacheBust(projectId, assetType, filename);
            console.log(`[Asset Gen] Saved: ${filepath}`);
        } else {
            console.log(`[Asset Gen] DL failed (${assetRes.status}), falling back to cloud URL.`);
        }
    } catch (e: any) {
        console.error(`[Asset Gen] DL error: ${e.message}. Falling back to cloud URL.`);
    }

    return NextResponse.json({ url: finalUrl });

  } catch (err: any) {
    console.error("Asset Gen Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
