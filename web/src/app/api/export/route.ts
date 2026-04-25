import { NextResponse } from 'next/server';
import { loadState, getProjectDir } from '@/lib/db';
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
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');
        if (!projectId) return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });
        
        const state = await loadState(projectId);
        if (!state || !state.scriptLines) throw new Error("No script lines found in state.");

        const projectDir = getProjectDir(projectId);

        const getLocalPath = (url: string) => {
             if (!url) return "";
             const pathname = url.split('?')[0];
             const match = pathname.match(/^\/api\/serve\/[^\/]+\/([^\/]+)\/(.+)$/);
             if (match) {
                 return path.join(projectDir, match[1], decodeURIComponent(match[2]));
             }
             return "";
        };

        // Resolve JianYing Draft Path
        let jyBasePath = state.jianyingPath?.trim();
        if (!jyBasePath) {
            if (process.platform === 'win32') {
                jyBasePath = path.join(process.env.LOCALAPPDATA || '', 'JianyingPro/User Data/Projects/com.lveditor.draft');
            } else if (process.platform === 'darwin') {
                jyBasePath = path.join(process.env.HOME || '', 'Movies/JianyingPro/User Data/Projects/com.lveditor.draft');
            } else {
                throw new Error("暂不支持在该系统上自动查找剪映草稿目录，请在设置中手动配置。");
            }
        }

        if (!fs.existsSync(jyBasePath)) {
            fs.mkdirSync(jyBasePath, { recursive: true });
        }

        const draftFolder = new DraftFolder(jyBasePath);
        const timestamp = Date.now();
        const draftName = `${projectId}_${timestamp}`;
        
        // createDraft returns a ScriptFile object
        const script = draftFolder.createDraft(draftName, 1080, 1920, { allowReplace: true });

        // Add 3 tracks: video, audio, text
        script.addTrack(TrackType.video).addTrack(TrackType.audio).addTrack(TrackType.text);

        // Create a 1x1 black image for fallback (Title Cards, missing videos, etc.)
        const blackImagePath = path.join(projectDir, 'black_bg.jpg');
        if (!fs.existsSync(blackImagePath)) {
            const blackJpgBase64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
            fs.writeFileSync(blackImagePath, Buffer.from(blackJpgBase64, 'base64'));
        }

        let currentGlobalTime = 0; // tracking cumulative seconds

        for (let i = 0; i < state.scriptLines.length; i++) {
            const dialogue = (state.scriptLines[i].dialogue || "").replace(/\[.*?\]\s*/g, '').trim();
            // Fallback to static images if video is not generated (useful for title cards or unrendered scenes)
            const videoUrl = state.sceneVideos[i] || state.sceneImages[i] || state.sceneStartImages[i]; 
            const audioUrl = state.sceneAudio[i];
            
            const videoPath = getLocalPath(videoUrl);
            const audioPath = getLocalPath(audioUrl);
            
            const trimStart = state.sceneVideoTrimStart?.[i] ?? 0;
            let fallbackDur = state.sceneDurations[i] || 8.0;
            const trimEnd = state.sceneVideoTrimEnd?.[i] ?? fallbackDur;
            const duration = Math.max(0.1, trimEnd - trimStart);
            const audioDelay = state.sceneAudioDelays?.[i] || 0;

            const globalStart = currentGlobalTime;
            const durationStr = `${duration.toFixed(3)}s`;

            // --- 1. Video Segment ---
            let finalVideoPath = videoPath;
            if (!finalVideoPath || !fs.existsSync(finalVideoPath)) {
                finalVideoPath = blackImagePath; // Fallback to black screen to keep timeline contiguous
            }

            if (finalVideoPath && fs.existsSync(finalVideoPath)) {
                try {
                    // Provide a safe fallback duration (e.g. 1 hour) to bypass ffprobe requirement
                    const vidMat = new VideoMaterial(finalVideoPath, { width: 1080, height: 1920, duration: 3600 * 1000000 });
                    const vidSeg = new VideoSegment(vidMat, trange(`${globalStart.toFixed(3)}s`, durationStr));
                    if (trimStart > 0) {
                        vidSeg.sourceTimerange = trange(`${trimStart.toFixed(3)}s`, durationStr);
                    } else {
                        vidSeg.sourceTimerange = trange(`0s`, durationStr);
                    }
                    script.addSegment(vidSeg);
                } catch(e) {
                    console.error("VideoMaterial error:", e);
                }
            }

            // --- 2. Audio Segment ---
            if (audioPath && fs.existsSync(audioPath)) {
                try {
                    const audMat = new AudioMaterial(audioPath, { duration: 3600 * 1000000 });
                    const audioGlobalStart = globalStart + audioDelay;
                    const audioDuration = Math.max(0.1, duration - audioDelay);
                    const audSeg = new AudioSegment(audMat, trange(`${audioGlobalStart.toFixed(3)}s`, `${audioDuration.toFixed(3)}s`));
                    audSeg.sourceTimerange = trange(`0s`, `${audioDuration.toFixed(3)}s`);
                    script.addSegment(audSeg);
                } catch(e) {
                    console.error("AudioMaterial error:", e);
                }
            }

            // --- 3. Text Segment ---
            if (dialogue) {
                const textGlobalStart = globalStart + audioDelay;
                const textDuration = Math.max(0.1, duration - audioDelay);
                const textSeg = new TextSegment(dialogue, trange(`${textGlobalStart.toFixed(3)}s`, `${textDuration.toFixed(3)}s`));
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
