/**
 * Freedom Studio — 单个剧本 API
 *
 * GET    /api/studio/scripts/[id]   → 获取剧本（含资产）
 * PATCH  /api/studio/scripts/[id]   → 更新剧本
 * DELETE /api/studio/scripts/[id]   → 删除剧本
 */
import { NextRequest, NextResponse } from 'next/server';
import { getScriptById, updateScript, deleteScript, listAssets } from '@/lib/studio/db';
import type { FsScriptUpdateInput } from '@/lib/studio/types';

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/studio/scripts/[id] */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const script = getScriptById(id);
    if (!script) {
      return NextResponse.json({ success: false, error: 'Script not found' }, { status: 404 });
    }
    // 同时返回该剧本的资产
    const assets = listAssets({ scriptId: id });
    return NextResponse.json({ success: true, script, assets });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/** PATCH /api/studio/scripts/[id] */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const input: FsScriptUpdateInput = {};

    if (body.title !== undefined) input.title = body.title;
    if (body.content !== undefined) input.content = body.content;
    if (body.synopsis !== undefined) input.synopsis = body.synopsis;
    if (body.genre !== undefined) input.genre = body.genre;
    if (body.episodeCount !== undefined) input.episodeCount = body.episodeCount;
    if (body.status !== undefined) input.status = body.status;
    if (body.metadata !== undefined) input.metadata = body.metadata;

    const script = updateScript(id, input);
    if (!script) {
      return NextResponse.json({ success: false, error: 'Script not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, script });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/** DELETE /api/studio/scripts/[id] */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ok = deleteScript(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Script not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
