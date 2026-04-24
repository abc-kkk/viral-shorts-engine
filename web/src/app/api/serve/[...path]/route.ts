import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getWorkspacePath } from '@/lib/db';

export const dynamic = 'force-dynamic';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.json': 'application/json',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: 'No path specified' }, { status: 400 });
    }

    // 安全校验：防止目录穿越
    const decoded = segments.map(s => decodeURIComponent(s));
    if (decoded.some(s => s.includes('..') || s.startsWith('/'))) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
    }

    const filePath = path.join(getWorkspacePath(), ...decoded);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      return NextResponse.json({ error: 'Cannot serve directory' }, { status: 400 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const buffer = fs.readFileSync(filePath);
    // [BUGFIX] 使用 ETag + must-revalidate 替代 immutable
    // 因为首尾帧文件会被同名覆盖（如 测试2_S4_Img.png），immutable 会导致浏览器永远返回旧图
    // 配合 push-asset 返回的 ?v=timestamp 参数，新图会被正确请求
    const etag = `"${stat.mtimeMs.toString(36)}-${stat.size.toString(36)}"`;
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=3600, must-revalidate',
        'ETag': etag,
      },
    });
  } catch (err: any) {
    console.error('[Serve] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
