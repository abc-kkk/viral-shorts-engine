import { NextResponse } from 'next/server';
import { getAssetDir } from '@/lib/db';
import { generateAssetFilename, getAssetTypeForTarget, getAssetUrlWithCacheBust } from '@/lib/assetUrl';
import type { TargetType, InboxItem } from '@/lib/types';
import fs from 'fs';
import path from 'path';
import { eventEmitter } from '@/lib/events';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function getInboxPath() {
    return path.join(process.cwd(), 'tmp', 'inbox.json');
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { mediaUrl, mediaType, referenceKeyword, base64Data } = await req.json();

    if (!mediaUrl && !base64Data) return NextResponse.json({ error: 'Missing media source' }, { status: 400, headers: corsHeaders });

    // Read active context to know where to save
    const cp = path.join(process.cwd(), 'tmp', 'active-context.json');
    if (!fs.existsSync(cp)) {
        throw new Error('No active project context found. Please click something in Studio first.');
    }
    const context = JSON.parse(fs.readFileSync(cp, 'utf-8'));
    let { projectId, targetType, index, meta } = context as {
        projectId: string;
        targetType: TargetType;
        index?: number;
        meta?: Record<string, any>;
    };

    if (!projectId) {
         throw new Error('Active project context is missing projectId.');
    }

    // [HOTFIX]: 解决并发提取首尾帧时上下文被覆盖的 Bug
    // 由于用户可能连续点击"生成首帧"和"生成尾帧"，active-context.json 只有最后一次的状态。
    // 但是，由于用户在 Chrome 扩展的弹窗里确认了 ID（如 测试2_S4_StartImg），我们可以从 referenceKeyword 中提取真正的意图。
    if (referenceKeyword && typeof referenceKeyword === 'string') {
        if (referenceKeyword.includes('_StartImg')) {
            targetType = 'sceneStartImage';
            const sMatch = referenceKeyword.match(/_S(\d+)_StartImg/);
            if (sMatch) index = parseInt(sMatch[1], 10);
        } else if (referenceKeyword.includes('_Img')) {
            targetType = 'sceneImage';
            const sMatch = referenceKeyword.match(/_S(\d+)_Img/);
            if (sMatch) index = parseInt(sMatch[1], 10);
        }
    }

    // 使用统一工具函数确定存储目录和文件名
    const assetType = getAssetTypeForTarget(targetType, mediaType);
    const assetsDir = getAssetDir(projectId, assetType);
    const filename = generateAssetFilename(targetType, projectId, index, meta, mediaType);
    
    let buffer;
    if (base64Data) {
        console.log(`[Extension] Receiving base64 data directly from browser...`);
        const base64 = base64Data.split(',')[1];
        buffer = Buffer.from(base64, 'base64');
    } else {
        console.log(`[Extension] Downloading ${mediaType} from ${mediaUrl.substring(0,40)}...`);
        const assetRes = await fetch(mediaUrl);
        if (!assetRes.ok) {
            throw new Error(`Failed to fetch media from url. Status: ${assetRes.status}`);
        }
        const arrayBuffer = await assetRes.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
    }
    
    const filepath = path.join(assetsDir, filename);
    fs.writeFileSync(filepath, buffer);
    const localUrl = getAssetUrlWithCacheBust(projectId, assetType, filename);
    console.log(`[Extension] Saved: ${filepath}`);

    // Emit to memory SSE stream
    eventEmitter.emit('inbox', {
        url: localUrl,
        mediaType,
        targetType,
        index,
        referenceKeyword,
        meta,
        timestamp: Date.now()
    });

    return NextResponse.json({ success: true, url: localUrl }, { headers: corsHeaders });

  } catch (err: any) {
    console.error("Push Asset Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}
