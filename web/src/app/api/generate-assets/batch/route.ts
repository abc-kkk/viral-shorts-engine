import { NextResponse } from 'next/server';
import { getAssetDir, getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { generateAssetFilename, getAssetTypeForTarget, getAssetUrlWithCacheBust } from '@/lib/assetUrl';
import type { TargetType } from '@/lib/types';
import { resolveFlowUrl } from '@/lib/detectFlowUrl';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { flowGenerateImages, flowUploadImage } from '@/lib/utils/flowApi';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * 批量图片生成接口
 * 
 * 接收多个 prompt，在一次 API 调用中全部完成，极大提升并发效率。
 * 
 * Request Body:
 * {
 *   tasks: [
 *     { prompt: string, referenceKeywords?: string[], targetType?: string, meta?: object },
 *     ...
 *   ],
 *   projectId: string,
 *   flowUrl?: string,
 *   aspectRatio?: string
 * }
 */

// 内存级缓存（与主路由共享进程，但独立 Map 实例）
const batchMediaIdCache = new Map<string, { mediaId: string, mtimeMs: number }>();

async function getAuthContext(flowUrlStr: string) {
    const flowUrl = new URL(flowUrlStr);
    const projectId = flowUrl.pathname.split('/').pop() || '';
    const portMatch = flowUrlStr.match(/port=(\d+)/);
    const port = portMatch ? portMatch[1] : '9222';
    
    const res = await fetch(`http://127.0.0.1:${port}/json/version`);
    const data = await res.json();
    const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl, defaultViewport: null });

    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('tools/flow/project'));
    if (!page) { await browser.disconnect(); throw new Error('未找到 Flow 页面'); }

    const cookies = await page.cookies();
    const stCookie = cookies.find(c => c.name === '__Secure-next-auth.session-token');
    if (!stCookie) { await browser.disconnect(); throw new Error('未找到 Session Token'); }

    const sessionRes = await fetch('https://labs.google/fx/api/auth/session', {
        headers: { 'Cookie': `__Secure-next-auth.session-token=${stCookie.value}` }
    });
    const at = (await sessionRes.json()).access_token;

    const recaptchaToken = await page.evaluate(async () => {
        // @ts-ignore
        return await window.grecaptcha.enterprise.execute('6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV', { action: 'IMAGE_GENERATION' });
    });

    await browser.disconnect();
    return { projectId, at, recaptchaToken };
}

async function resolveReferenceImage(kw: string, at: string, projectId: string, localProjectId: string, imagesDir: string): Promise<string | null> {
    let filePath = path.join(imagesDir, `${kw}.png`);
    let found = fs.existsSync(filePath);

    if (!found) {
        const db = getDb();
        const char = db.select().from(schema.characters).where(and(
            eq(schema.characters.projectId, localProjectId),
            eq(schema.characters.name, kw)
        )).get();
        if (char && char.imageUrl) {
            const urlParts = char.imageUrl.split('/');
            const filename = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]);
            const potentialPath = path.join(imagesDir, filename);
            if (fs.existsSync(potentialPath)) { filePath = potentialPath; found = true; }
        }
    }
    if (!found && fs.existsSync(kw)) { filePath = kw; found = true; }
    if (!found) return null;

    // 缓存检查
    const stats = fs.statSync(filePath);
    const cached = batchMediaIdCache.get(filePath);
    if (cached && cached.mtimeMs === stats.mtimeMs) return cached.mediaId;

    const buffer = fs.readFileSync(filePath);
    const mediaId = await flowUploadImage(projectId, at, buffer, 'IMAGE_ASPECT_RATIO_LANDSCAPE');
    if (mediaId) batchMediaIdCache.set(filePath, { mediaId, mtimeMs: stats.mtimeMs });
    return mediaId;
}

export async function POST(req: Request) {
    try {
        const { tasks, projectId: localProjectId, flowUrl: rawFlowUrl, aspectRatio } = await req.json();

        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
            return NextResponse.json({ error: 'Missing tasks array' }, { status: 400 });
        }

        const flowUrl = await resolveFlowUrl(rawFlowUrl);
        if (!flowUrl) {
            return NextResponse.json({ error: '未找到 Flow URL' }, { status: 400 });
        }

        console.log(`[Batch API] Generating ${tasks.length} images in ONE batch call...`);
        const auth = await getAuthContext(flowUrl);
        const imagesDir = getAssetDir(localProjectId, 'images');

        // 先统一上传所有参考图（去重）
        const allKeywords = new Set<string>();
        for (const task of tasks) {
            if (task.referenceKeywords) {
                for (const kw of task.referenceKeywords) allKeywords.add(kw);
            }
        }

        const keywordToMediaId = new Map<string, string>();
        for (const kw of allKeywords) {
            const mediaId = await resolveReferenceImage(kw, auth.at, auth.projectId, localProjectId, imagesDir);
            if (mediaId) keywordToMediaId.set(kw, mediaId);
        }
        console.log(`[Batch API] Uploaded ${keywordToMediaId.size} unique reference images`);

        // 前端已经分好批（每批最多4个），直接一次调用即可
        const referenceImageIds = Array.from(keywordToMediaId.values());
        const prompts = tasks.map((t: any) => t.prompt as string);

        console.log(`[Batch API] Generating ${prompts.length} images in one call...`);

        const imageRes = await flowGenerateImages({
            projectId: auth.projectId,
            at: auth.at,
            recaptchaToken: auth.recaptchaToken,
            prompts,
            aspectRatio: aspectRatio || 'IMAGE_ASPECT_RATIO_LANDSCAPE',
            referenceImageIds
        });

        // 下载所有结果并落盘
        const results: { index: number; url?: string; error?: string }[] = [];
        const mediaArray = imageRes.media || [];

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const media = mediaArray[i];
            const fifeUrl = media?.image?.generatedImage?.fifeUrl;

            if (!fifeUrl) {
                results.push({ index: i, error: '未返回 CDN 地址' });
                continue;
            }

            try {
                const targetType: TargetType = task.targetType || 'locationImage';
                const assetType = getAssetTypeForTarget(targetType, 'image');
                const assetsDir = getAssetDir(localProjectId, assetType);
                const filename = generateAssetFilename(targetType, localProjectId, task.index, task.meta, 'image');

                const assetRes = await fetch(fifeUrl);
                if (!assetRes.ok) throw new Error(`DL failed: ${assetRes.status}`);
                const buffer = Buffer.from(await assetRes.arrayBuffer());
                fs.writeFileSync(path.join(assetsDir, filename), buffer);

                const localUrl = getAssetUrlWithCacheBust(localProjectId, assetType, filename);
                results.push({ index: i, url: localUrl });
                console.log(`[Batch API] ✅ [${i + 1}/${tasks.length}] ${filename}`);
            } catch (e: any) {
                results.push({ index: i, error: e.message });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (err: any) {
        console.error('[Batch API] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
