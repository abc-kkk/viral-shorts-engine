import { NextResponse } from 'next/server';
import { loadState, getAssetDir, getProjectDir } from '@/lib/db';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';
export const maxDuration = 3000;

export async function POST(req: Request) {
    try {
        const { searchParams, origin } = new URL(req.url);
        const projectId = searchParams.get('projectId');
        if (!projectId) return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });
        
        const state = await loadState(projectId);
        if (!state || !state.scriptLines) throw new Error("No script lines found in state.");

        const projectDir = getProjectDir(projectId);
        const exportsDir = getAssetDir(projectId, 'exports');
        const timestamp = Date.now();
        const outFileName = `final_${timestamp}.mp4`;
        const outFile = path.join(exportsDir, outFileName);

        const getLocalPath = (url: string) => {
             if (!url) return "";
             const match = url.match(/^\/api\/serve\/[^\/]+\/([^\/]+)\/(.+)$/);
             if (match) {
                 return path.join(projectDir, match[1], match[2]);
             }
             return "";
        };

        const runCommand = (cmd: string): Promise<string> => {
            return new Promise((resolve, reject) => {
                exec(cmd, {
                    cwd: process.cwd(),
                    maxBuffer: 1024 * 1024 * 100, // 100MB output allowance
                    env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin` }
                }, (error, stdout, stderr) => {
                    if (error) reject(new Error(stderr || error.message));
                    else resolve(stdout);
                });
            });
        };

        let fontPath = '/System/Library/Fonts/PingFang.ttc';
        if (process.platform === 'win32') {
            fontPath = 'C:\\\\Windows\\\\Fonts\\\\msyh.ttc'; // Microsoft YaHei on Windows
            if (!fs.existsSync(fontPath)) fontPath = 'C:\\\\Windows\\\\Fonts\\\\simhei.ttf'; // Fallback
        }
        const chunkFiles: string[] = [];
        
        console.log(`[Export FFmpeg] Starting FFmpeg rapid compile for ${projectId}...`);

        for (let i = 0; i < state.scriptLines.length; i++) {
            const dialogue = (state.scriptLines[i].dialogue || "").replace(/\[.*?\]\s*/g, '').trim();
            const videoUrl = state.sceneVideos[i]; 
            const audioUrl = state.sceneAudio[i];
            
            const videoPath = getLocalPath(videoUrl);
            const audioPath = getLocalPath(audioUrl);
            
            const trimStart = state.sceneVideoTrimStart?.[i] ?? 0;
            let fallbackDur = state.sceneDurations[i] || 8.0;
            const trimEnd = state.sceneVideoTrimEnd?.[i] ?? fallbackDur;
            const duration = Math.max(0.1, trimEnd - trimStart).toFixed(2);
            const audioDelay = state.sceneAudioDelays?.[i] || 0;
            
            const chunkOut = path.join(exportsDir, `chunk_${timestamp}_${i}.mp4`);
            chunkFiles.push(chunkOut);
            
            let filterComplex = '';
            let inputs = '';
            let mapV = '';
            let mapA = '';
            let inputIdx = 0;
            
            // Video Input
            if (videoPath && fs.existsSync(videoPath)) {
                inputs += `-ss ${trimStart} -t ${duration} -i "${videoPath}" `;
                // TikTok Style Blurred Background trick for FFmpeg
                filterComplex += `[${inputIdx}:v]split[bg_${i}][fg_${i}]; `;
                filterComplex += `[bg_${i}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:5[bgout_${i}]; `;
                filterComplex += `[fg_${i}]scale=1080:1920:force_original_aspect_ratio=decrease[fgout_${i}]; `;
                filterComplex += `[bgout_${i}][fgout_${i}]overlay=(W-w)/2:(H-h)/2[vscaled]; `;
                inputIdx++;
            } else {
                inputs += `-f lavfi -i color=c=black:s=1080x1920:d=${duration} `;
                filterComplex += `[${inputIdx}:v]null[vscaled]; `;
                inputIdx++;
            }
            
            // Audio Input
            if (audioPath && fs.existsSync(audioPath)) {
                inputs += `-i "${audioPath}" `;
                const delayMs = Math.round(audioDelay * 1000);
                // `apad` ensures the audio track pads with silence indefinitely to cover any trailing gaps
                filterComplex += `[${inputIdx}:a]adelay=${delayMs}|${delayMs},apad[a1]; `;
                mapA = `-map "[a1]"`;
                inputIdx++;
            } else {
                inputs += `-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t ${duration} `;
                mapA = `-map ${inputIdx}:a`;
                inputIdx++;
            }
            
            // Subtitles (No Shadow, Auto-Wrapped)
            if (dialogue) {
                const wrapText = (text: string, max: number = 15) => {
                    let res = '';
                    while (text.length > max) {
                        res += text.substring(0, max) + '\n';
                        text = text.substring(max);
                    }
                    res += text;
                    return res;
                };
                const wrappedDialogue = wrapText(dialogue);
                
                const textFile = path.join(exportsDir, `text_${timestamp}_${i}.txt`);
                fs.writeFileSync(textFile, wrappedDialogue, 'utf-8');
                // Removed the fixed y=h*0.85 and instead used y=h-250 so multi-lines grow upwards predictably? 
                // Actually `drawtext` grows downwards. If `y=h*0.80` is used, it sits at 80%.
                filterComplex += `[vscaled]drawtext=fontfile='${fontPath}':textfile='${textFile}':fontcolor=white:fontsize=54:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h*0.80:enable='between(t,${audioDelay},${duration})'[vfinal]`;
                mapV = `-map "[vfinal]"`;
            } else {
                mapV = `-map "[vscaled]"`;
            }
            
            filterComplex = filterComplex.trim().replace(/;$/, '');
            const filterArg = filterComplex ? `-filter_complex "${filterComplex}"` : '';
            
            const ffmpegPath = require('ffmpeg-static');
            const chunkFfmpegBin = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';

            // `-t ${duration}` rigorously slices the output so the padded audio perfectly matches the video duration
            const cmd = `"${chunkFfmpegBin}" -y ${inputs} ${filterArg} ${mapV} ${mapA} -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p -r 30 -c:a aac -ar 44100 -b:a 192k -t ${duration} "${chunkOut}"`;
            console.log(`[Chunk ${i}] Executing filter...`);
            await runCommand(cmd);
        }
        
        const ffmpegPath = require('ffmpeg-static');
        const ffmpegBin = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';

        // 2) Concat Chunk files
        const concatListPath = path.join(exportsDir, `concat_${timestamp}.txt`);
        const concatContent = chunkFiles.map(f => `file '${f}'`).join('\n');
        fs.writeFileSync(concatListPath, concatContent, 'utf-8');

        const concatCmd = `"${ffmpegBin}" -y -f concat -safe 0 -i "${concatListPath}" -c copy "${outFile}"`;
        console.log(`[Concat] Executing concat...`);
        await runCommand(concatCmd);
        
        // 3) Background Cleanup
        setTimeout(() => {
            chunkFiles.forEach(f => { try { fs.unlinkSync(f); } catch(e){} });
            try { fs.unlinkSync(concatListPath); } catch(e){}
            for(let i=0; i<state.scriptLines.length; i++) {
                try { fs.unlinkSync(path.join(exportsDir, `text_${timestamp}_${i}.txt`)); } catch(e){}
            }
        }, 3000);
        
        return NextResponse.json({ success: true, file: outFile });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
