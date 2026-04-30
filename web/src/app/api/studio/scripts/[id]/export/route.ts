import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { 
  DraftFolder, 
  TrackType, 
  VideoMaterial, 
  VideoSegment, 
  AudioMaterial, 
  AudioSegment, 
  TextSegment, 
  trange 
} from 'jsjianyingdraft';

export const dynamic = 'force-dynamic';
export const maxDuration = 3000;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { scriptTitle, shots } = body;
        
        if (!scriptTitle || !shots || !Array.isArray(shots)) {
            return NextResponse.json({ error: '无效的导出数据' }, { status: 400 });
        }

        // Find project dir
        const workspacePath = process.env.WORKSPACE_PATH || path.join(process.cwd(), '..', '..', 'short');
        const projectDir = path.join(workspacePath, 'projects', scriptTitle);
        
        const getLocalPath = (url: string) => {
             if (!url) return "";
             const pathname = url.split('?')[0];
             // /api/serve/projects%2Ftest/sceneVideo/123.mp4 -> match[1] = sceneVideo, match[2] = 123.mp4
             const match = pathname.match(/^\/api\/serve\/[^\/]+\/([^\/]+)\/(.+)$/);
             if (match) {
                 return path.join(projectDir, match[1], decodeURIComponent(match[2]));
             }
             return "";
        };

        let jyBasePath = '';
        if (process.platform === 'win32') {
            jyBasePath = path.join(process.env.LOCALAPPDATA || '', 'JianyingPro/User Data/Projects/com.lveditor.draft');
        } else if (process.platform === 'darwin') {
            jyBasePath = path.join(process.env.HOME || '', 'Movies/JianyingPro/User Data/Projects/com.lveditor.draft');
        } else {
            throw new Error("暂不支持在该系统上自动查找剪映草稿目录，请在设置中手动配置。");
        }

        if (!fs.existsSync(jyBasePath)) {
            fs.mkdirSync(jyBasePath, { recursive: true });
        }

        const draftFolder = new DraftFolder(jyBasePath);
        const timestamp = Date.now();
        const draftName = `FS_${scriptTitle}_${timestamp}`;
        
        // createDraft returns a ScriptFile object
        const script = draftFolder.createDraft(draftName, 1080, 1920, { allowReplace: true });

        // Add 3 tracks: video, audio, text
        script.addTrack(TrackType.video).addTrack(TrackType.audio).addTrack(TrackType.text);

        // Create a 1x1 black image for fallback
        const blackImagePath = path.join(projectDir, 'black_bg.jpg');
        if (!fs.existsSync(blackImagePath)) {
            if (!fs.existsSync(projectDir)) {
                fs.mkdirSync(projectDir, { recursive: true });
            }
            const blackJpgBase64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
            fs.writeFileSync(blackImagePath, Buffer.from(blackJpgBase64, 'base64'));
        }

        let currentGlobalTime = 0; 

        for (let i = 0; i < shots.length; i++) {
            const shot = shots[i];
            const dialogue = shot.dialogue || "";
            // Use video first, fallback to frame image
            const videoUrl = shot.videoUrl || shot.firstFrameImage || shot.lastFrameImage; 
            const audioUrl = shot.audioUrl;
            
            const videoPath = getLocalPath(videoUrl);
            const audioPath = getLocalPath(audioUrl);
            
            // 自由创作室暂不开放微调时间轴，默认每段占位 5 秒。导入剪映后素材会被裁切至实际长度。
            const duration = 5.0; 
            
            const globalStart = currentGlobalTime;
            const durationStr = `${duration.toFixed(3)}s`;

            // --- 1. Video Segment ---
            let finalVideoPath = videoPath;
            if (!finalVideoPath || !fs.existsSync(finalVideoPath)) {
                finalVideoPath = blackImagePath;
            }

            if (finalVideoPath && fs.existsSync(finalVideoPath)) {
                try {
                    const vidMat = new VideoMaterial(finalVideoPath, { width: 1080, height: 1920, duration: 3600 * 1000000 });
                    const vidSeg = new VideoSegment(vidMat, trange(`${globalStart.toFixed(3)}s`, durationStr));
                    vidSeg.sourceTimerange = trange(`0s`, durationStr);
                    script.addSegment(vidSeg);
                } catch(e) {
                    console.error("VideoMaterial error:", e);
                }
            }

            // --- 2. Audio Segment ---
            if (audioPath && fs.existsSync(audioPath)) {
                try {
                    const audMat = new AudioMaterial(audioPath, { duration: 3600 * 1000000 });
                    // 音频从视频的开头起播
                    const audSeg = new AudioSegment(audMat, trange(`${globalStart.toFixed(3)}s`, durationStr));
                    audSeg.sourceTimerange = trange(`0s`, durationStr);
                    script.addSegment(audSeg);
                } catch(e) {
                    console.error("AudioMaterial error:", e);
                }
            }

            // --- 3. Text Segment ---
            if (dialogue) {
                const textSeg = new TextSegment(dialogue, trange(`${globalStart.toFixed(3)}s`, durationStr));
                script.addSegment(textSeg);
            }

            currentGlobalTime += duration;
        }

        script.save();

        const draftFullPath = path.join(jyBasePath, draftName);

        return NextResponse.json({ success: true, file: draftFullPath });

    } catch (err: any) {
        console.error("Export Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
