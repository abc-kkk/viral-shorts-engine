/**
 * Freedom Studio — 剧本 API
 *
 * GET  /api/studio/scripts          → 列表
 * POST /api/studio/scripts          → 创建
 * GET  /api/studio/scripts/[id]     → 获取
 * PATCH /api/studio/scripts/[id]    → 更新
 * DELETE /api/studio/scripts/[id]   → 删除
 */
import { NextRequest, NextResponse } from 'next/server';
import { createScript, listScripts, getScriptById, updateScript, deleteScript } from '@/lib/studio/db';
import type { FsScriptCreateInput, FsScriptUpdateInput } from '@/lib/studio/types';

/** GET /api/studio/scripts */
export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('search') || undefined;
    const status = req.nextUrl.searchParams.get('status') as FsScriptUpdateInput['status'] | null;

    const scripts = listScripts({ search, status: status || undefined });
    return NextResponse.json({ success: true, scripts });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/** POST /api/studio/scripts */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, synopsis, genre, episodeCount, source, metadata } = body;

    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 });
    }

    const input: FsScriptCreateInput = {
      title: title.trim(),
      content,
      synopsis,
      genre,
      episodeCount,
      source,
      metadata,
    };

    const script = createScript(input);
    return NextResponse.json({ success: true, script }, { status: 201 });
  } catch (e: any) {
    console.error('[Studio API] POST /scripts error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
