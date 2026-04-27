import { NextResponse } from 'next/server';
import { getAssetDir, getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and, or } from 'drizzle-orm';
import { generateAssetFilename, getAssetTypeForTarget, getAssetUrlWithCacheBust } from '@/lib/assetUrl';
import type { TargetType } from '@/lib/types';
import { PassthroughMetaSchema } from '@/lib/validation';
import { resolveFlowUrl } from '@/lib/detectFlowUrl';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { flowGenerateImages, flowSubmitVideoTask, flowPollVideoStatus, flowUploadImage } from '@/lib/utils/flowApi';

export const maxDuration = 300; // Vercel timeout (300s = 5m), fine for local
export const dynamic = 'force-dynamic';

// 提取验证码与 AT (后端自动处理)
async function getAuthContext(flowUrlStr: string, isVideo: boolean) {
    const flowUrl = new URL(flowUrlStr);
    const projectId = flowUrl.pathname.split('/').pop() || '';
    
    // 假设 Flow URL 包含了 debugger port 信息，如果没有则默认 9222
    const portMatch = flowUrlStr.match(/port=(\d+)/);
    const port = portMatch ? portMatch[1] : '9222';
    
    let browser;
    try {
        const res = await fetch(`http://127.0.0.1:${port}/json/version`);
        const data = await res.json();
        browser = await puppeteer.connect({
            browserWSEndpoint: data.webSocketDebuggerUrl,
            defaultViewport: null,
        });
    } catch (e) {
        throw new Error(`无法连接到 Chrome CDP (Port ${port})。请确保开启了 --remote-debugging-port=${port}`);
    }

    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('tools/flow/project'));
    if (!page) {
        await browser.disconnect();
        throw new Error('未找到打开的 Flow 页面，请先在 Chrome 中打开目标项目');
    }

    const cookies = await page.cookies();
    const stCookie = cookies.find(c => c.name === '__Secure-next-auth.session-token');
    if (!stCookie) {
        await browser.disconnect();
        throw new Error('未找到 Session Token (未登录或 Cookie 失效)');
    }

    const st = stCookie.value;

    const sessionRes = await fetch(`https://labs.google/fx/api/auth/session`, {
        headers: { 'Cookie': `__Secure-next-auth.session-token=${st}` }
    });
    const at = (await sessionRes.json()).access_token;

    const action = isVideo ? 'VIDEO_GENERATION' : 'IMAGE_GENERATION';
    const recaptchaToken = await page.evaluate(async (act) => {
        // @ts-ignore
        return await window.grecaptcha.enterprise.execute('6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV', { action: act });
    }, action);

    await browser.disconnect();
    return { projectId, at, recaptchaToken };
}

// 在内存中缓存已上传的 Media ID，避免同一个角色/图片被重复上传
// 键为: filePath, 值为: { mediaId, mtimeMs }
const mediaIdCache = new Map<string, { mediaId: string, mtimeMs: number }>();

// 根据本地文件名，上传本地图片换取 Media ID
async function getReferenceImageIds(keywords: string[], at: string, projectId: string, localProjectId: string) {
    const ids: string[] = [];
    const imagesDir = getAssetDir(localProjectId, 'images');

    const db = getDb();

    for (const kw of keywords) {
        let filePath = path.join(imagesDir, `${kw}.png`);
        let found = fs.existsSync(filePath);

        if (!found) {
            // 去数据库查找这个名字对应的 Character，获取真实的文件名
            const char = db.select().from(schema.characters).where(and(
                eq(schema.characters.projectId, localProjectId),
                eq(schema.characters.name, kw)
            )).get();
            
            if (char && char.imageUrl) {
                const urlParts = char.imageUrl.split('/');
                const filename = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]);
                const potentialPath = path.join(imagesDir, filename);
                if (fs.existsSync(potentialPath)) {
                    filePath = potentialPath;
                    found = true;
                }
            }
        }

        if (!found) {
            // 再去场景图里兜底查一下 (匹配以 kw 结尾的 imageRef 或 imageAsset)
            // 这里用简单正则或者包含判断。比如传过来的是 url
            if (kw.includes('/api/serve/')) {
                const urlParts = kw.split('/');
                const filename = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]);
                const potentialPath = path.join(imagesDir, filename);
                if (fs.existsSync(potentialPath)) {
                    filePath = potentialPath;
                    found = true;
                }
            }
        }

        if (!found) {
            // 如果没找到 .png，可能传的是全路径，或者其他后缀
            if (fs.existsSync(kw)) { filePath = kw; found = true; }
            else if (fs.existsSync(path.join(imagesDir, kw))) { filePath = path.join(imagesDir, kw); found = true; }
        }

        if (!found) {
            console.log(`[API Flow] Warning: Reference image not found on disk for keyword: ${kw}`);
            continue;
        }
        
        try {
            const stats = fs.statSync(filePath);
            const cacheKey = filePath;
            const cached = mediaIdCache.get(cacheKey);

            // 如果缓存存在，且文件修改时间没变，直接复用！
            if (cached && cached.mtimeMs === stats.mtimeMs) {
                console.log(`[API Flow] ⚡ Using cached mediaId for ${kw}`);
                ids.push(cached.mediaId);
                continue;
            }

            const buffer = fs.readFileSync(filePath);
            console.log(`[API Flow] ⬆️ Uploading reference image: ${path.basename(filePath)}...`);
            const mediaId = await flowUploadImage(projectId, at, buffer, 'IMAGE_ASPECT_RATIO_LANDSCAPE');
            if (mediaId) {
                mediaIdCache.set(cacheKey, { mediaId, mtimeMs: stats.mtimeMs });
                ids.push(mediaId);
                console.log(`[API Flow] ✅ Uploaded ${kw} -> ${mediaId}`);
            }
        } catch (e) {
            console.error(`[API Flow] ❌ Failed to upload reference image ${kw}:`, e);
        }
    }
    return ids;
}

export async function POST(req: Request) {
  try {
    const { prompt, model, referenceKeyword, referenceKeywords, startImageUrl, flowUrl: rawFlowUrl, projectId: localProjectId, fireAndForget, veoMode, aspectRatio: reqAspectRatio, targetType: reqTargetType, index: reqIndex, meta: reqMeta } = await req.json();

    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });

    const flowUrl = await resolveFlowUrl(rawFlowUrl);
    if (!flowUrl) {
      return NextResponse.json({ error: '未找到 Flow URL。请在调试 Chrome 中打开 Flow 页面' }, { status: 400 });
    }

    const validationResult = PassthroughMetaSchema.safeParse({ targetType: reqTargetType, index: reqIndex, meta: reqMeta });
    const validMeta = validationResult.success ? validationResult.data : { targetType: reqTargetType, meta: reqMeta };

    const isVideo = model === 'Veo 3.1';
    console.log(`[API Flow] Generating ${isVideo ? 'Video' : 'Image'} via API...`);

    const auth = await getAuthContext(flowUrl, isVideo);
    
    // 解析依赖的关键词并上传获取 Media ID
    let keywords: string[] = [];
    if (referenceKeywords && Array.isArray(referenceKeywords)) keywords = referenceKeywords;
    else if (referenceKeyword) keywords = [referenceKeyword];
    else if (startImageUrl) keywords = [startImageUrl];

    let startImageId: string | undefined;
    let endImageId: string | undefined;
    let imageInputs: string[] = [];

    if (keywords.length > 0) {
        console.log(`[API Flow] Resolving ${keywords.length} reference keywords...`);
        const mediaIds = await getReferenceImageIds(keywords, auth.at, auth.projectId, localProjectId);
        if (isVideo && mediaIds.length >= 1) {
            startImageId = mediaIds[0];
            if (mediaIds.length >= 2) endImageId = mediaIds[1];
        } else {
            imageInputs = mediaIds;
        }
    }

    let finalFifeUrl = '';

    if (isVideo) {
        // 生成视频
        const videoRes = await flowSubmitVideoTask({
            projectId: auth.projectId,
            at: auth.at,
            recaptchaToken: auth.recaptchaToken,
            prompt,
            aspectRatio: reqAspectRatio || "VIDEO_ASPECT_RATIO_LANDSCAPE",
            startImageId,
            endImageId
        });

        const taskId = videoRes.operations?.[0]?.operation?.name;
        if (!taskId) throw new Error('未能获取到 Task ID');
        console.log(`[API Flow] Video task submitted: ${taskId}. Polling...`);

        // 轮询状态
        let completed = false;
        let attempt = 0;
        while (!completed && attempt < 40) {
            attempt++;
            await new Promise(r => setTimeout(r, 5000));
            const pollRes = await flowPollVideoStatus(auth.at, taskId);
            const status = pollRes.operations?.[0]?.status;
            console.log(`[API Flow] Poll ${attempt}: ${status}`);

            if (status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
                completed = true;
                const metadata = pollRes.operations[0].operation?.metadata;
                // 提取 URL
                const rawDataStr = metadata['@type'] ? JSON.stringify(metadata) : '';
                const match = rawDataStr.match(/https:\/\/flow-content\.google\/video\/[^"]+/);
                if (match) finalFifeUrl = match[0];
                else throw new Error('Video generation succeeded but URL not found in metadata');
            } else if (status === 'MEDIA_GENERATION_STATUS_FAILED') {
                throw new Error('视频生成被拒绝或失败');
            }
        }
        if (!completed) throw new Error('视频生成轮询超时');

    } else {
        // 生成图片
        const imageRes = await flowGenerateImages({
            projectId: auth.projectId,
            at: auth.at,
            recaptchaToken: auth.recaptchaToken,
            prompts: [prompt],
            aspectRatio: reqAspectRatio || "IMAGE_ASPECT_RATIO_LANDSCAPE", 
            referenceImageIds: imageInputs
        });

        const fifeUrl = imageRes.media?.[0]?.image?.generatedImage?.fifeUrl;
        if (!fifeUrl) throw new Error('图片生成失败，未返回 CDN 地址');
        finalFifeUrl = fifeUrl;
    }

    // DOWNLOAD TO LOCAL
    const targetType: TargetType = validMeta.targetType || (isVideo ? 'sceneVideo' : 'sceneImage');
    const assetType = getAssetTypeForTarget(targetType, isVideo ? 'video' : 'image');
    const assetsDir = getAssetDir(localProjectId, assetType);
    const filename = generateAssetFilename(targetType, localProjectId, validMeta.index, validMeta.meta, isVideo ? 'video' : 'image');
    
    console.log(`[API Flow] Downloading asset to ${assetType}/${filename}...`);
    const assetRes = await fetch(finalFifeUrl);
    if (!assetRes.ok) throw new Error(`Download failed: ${assetRes.status}`);
    const buffer = Buffer.from(await assetRes.arrayBuffer());
    const filepath = path.join(assetsDir, filename);
    fs.writeFileSync(filepath, buffer);
    
    const finalLocalUrl = getAssetUrlWithCacheBust(localProjectId, assetType, filename);
    console.log(`[API Flow] ✅ Asset saved: ${finalLocalUrl}`);

    // 直接返回成功结果，前端即可同步更新 UI
    return NextResponse.json({ success: true, url: finalLocalUrl });

  } catch (err: any) {
    console.error("Asset Gen Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
