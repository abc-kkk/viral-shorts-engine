import { NextResponse } from 'next/server';
import { getAssetDir, getDb, getWorkspacePath } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and, or } from 'drizzle-orm';
import { generateAssetFilename, getAssetTypeForTarget, getAssetUrlWithCacheBust } from '@/lib/assetUrl';
import type { TargetType } from '@/lib/types';
import { PassthroughMetaSchema } from '@/lib/validation';
import { resolveFlowUrl } from '@/lib/detectFlowUrl';
import fs from 'fs';
import path from 'path';
import { flowGenerateImages, flowSubmitVideoTask, flowPollVideoStatus, flowUploadImage, getAuthContext } from '@/lib/utils/flowApi';

export const maxDuration = 300; // Vercel timeout (300s = 5m), fine for local
export const dynamic = 'force-dynamic';


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

        let fileBuffer: Buffer | null = null;
        let fileMtime = 0;
        let cacheKey = '';

        // 1. 特殊情况：如果是 3D 布局预设 (形如 Layout_123456)
        if (kw.startsWith('Layout_')) {
            const numPart = kw.replace('Layout_', '');
            const ws = getWorkspacePath();
            const layoutsDir = path.join(ws, '_layouts');
            if (fs.existsSync(layoutsDir)) {
                const files = fs.readdirSync(layoutsDir).filter(f => f.endsWith('.json') && f.includes(numPart));
                if (files.length > 0) {
                    const layoutPath = path.join(layoutsDir, files[0]);
                    try {
                        const layoutData = JSON.parse(fs.readFileSync(layoutPath, 'utf-8'));
                        if (layoutData.image) {
                            let base64Data = layoutData.image;
                            if (base64Data.includes(',')) {
                                base64Data = base64Data.split(',')[1];
                            }
                            fileBuffer = Buffer.from(base64Data, 'base64');
                            fileMtime = fs.statSync(layoutPath).mtimeMs;
                            cacheKey = layoutPath;
                            found = true;
                        }
                    } catch (e) {
                        console.error(`[API Flow] Error parsing layout preset for ${kw}:`, e);
                    }
                }
            }
        }

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
            if (!fileBuffer) {
                const stats = fs.statSync(filePath);
                fileMtime = stats.mtimeMs;
                cacheKey = filePath;
            }

            const cached = mediaIdCache.get(cacheKey);

            // 如果缓存存在，且文件修改时间没变，直接复用！
            if (cached && cached.mtimeMs === fileMtime) {
                console.log(`[API Flow] ⚡ Using cached mediaId for ${kw}`);
                ids.push({ mediaId: cached.mediaId, fileName: cached.fileName, keyword: kw });
                continue;
            }

            if (!fileBuffer) {
                fileBuffer = fs.readFileSync(filePath);
            }
            
            console.log(`[API Flow] ⬆️ Uploading reference image: ${kw}...`);
            const uploadResult = await flowUploadImage(projectId, at, fileBuffer, 'IMAGE_ASPECT_RATIO_LANDSCAPE');
            if (uploadResult && uploadResult.mediaId) {
                const { mediaId, fileName } = uploadResult;
                mediaIdCache.set(cacheKey, { mediaId, fileName, mtimeMs: fileMtime });
                ids.push({ mediaId, fileName, keyword: kw });
                console.log(`[API Flow] ✅ Uploaded ${kw} -> ${mediaId} (${fileName})`);
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
    let referenceAssets: Array<{ mediaId: string, fileName: string, keyword: string }> = [];

    if (keywords.length > 0) {
        console.log(`[API Flow] Resolving ${keywords.length} reference keywords...`);
        referenceAssets = await getReferenceImageIds(keywords, auth.at, auth.projectId, localProjectId);
        const mediaIds = referenceAssets.map(a => a.mediaId);
        if (isVideo) {
            if (veoMode === 'r2v' || veoMode === 'reference') {
                imageInputs = mediaIds; // R2V 模式将传入的所有图片作为参考素材
            } else if (mediaIds.length >= 1) {
                startImageId = mediaIds[0];
                if (mediaIds.length >= 2) endImageId = mediaIds[1];
            }
        } else {
            imageInputs = mediaIds;
        }
    }

    let finalFifeUrl = '';

    if (isVideo) {
        // 读取全局视频模型设置
        const db = getDb();
        const videoModelState = db.select().from(schema.systemStates).where(eq(schema.systemStates.key, 'videoModel')).get();
        const resolvedVideoModel = videoModelState?.value || 'veo_3_1_t2v_lite';
        console.log(`[API Flow] Video model: ${resolvedVideoModel}`);

        // 还原：把 {@苏母} 脱敏成纯文本，防止谷歌的安全拦截或解析错误
        // 之所以不用 fileName 替换，是因为真正的失败原因很可能是之前的 PNG 文件被错误标记为 image/jpeg 导致的引擎崩溃
        const safePrompt = prompt.replace(/\{@([^{}]+)\}/g, '$1');

        // 生成视频
        const videoRes = await flowSubmitVideoTask({
            projectId: auth.projectId,
            at: auth.at,
            recaptchaToken: auth.recaptchaToken,
            prompt: safePrompt,
            aspectRatio: reqAspectRatio || "VIDEO_ASPECT_RATIO_LANDSCAPE",
            startImageId,
            endImageId,
            referenceImageIds: (veoMode === 'r2v' || veoMode === 'reference') ? imageInputs : undefined,
            modelKey: resolvedVideoModel
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
                const op = pollRes.operations?.[0];
                const errMsg = op?.error?.message || '视频生成被拒绝或失败 (可能是 Safety Filter 或上游引擎解析错误)';
                throw new Error(`视频生成被拒绝或失败: ${errMsg}`);
            }
        }
        if (!completed) throw new Error('视频生成轮询超时');

    } else {
        // 模型名称映射 (匹配 flow2api 结构)
        const db = getDb();
        const state = db.select().from(schema.systemStates).where(eq(schema.systemStates.key, 'imageModel')).get();
        const globalModel = state?.value;
        const finalModel = globalModel || model || "Nano Banana Pro";

        let resolvedModelName = "NARWHAL"; // 默认 3.1 Flash
        if (finalModel === "Nano Banana Pro") resolvedModelName = "GEM_PIX_2"; // Gemini 3.0 Pro
        else if (finalModel === "Nano Banana 2") resolvedModelName = "NARWHAL"; // Gemini 3.1 Flash (原 GEM_PIX 报 500，切换为更稳的 3.1)
        else if (finalModel === "Imagen 4") resolvedModelName = "IMAGEN_3_5"; // Imagen 4.0

        // 生成图片
        const imageRes = await flowGenerateImages({
            projectId: auth.projectId,
            at: auth.at,
            recaptchaToken: auth.recaptchaToken,
            prompts: [prompt],
            aspectRatio: reqAspectRatio || "IMAGE_ASPECT_RATIO_LANDSCAPE", 
            referenceImageIds: imageInputs,
            modelName: resolvedModelName
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
