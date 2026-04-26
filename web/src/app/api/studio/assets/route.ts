/**
 * Freedom Studio — 资产 API
 *
 * GET  /api/studio/assets?scriptId=xxx&type=character  → 列表
 * POST /api/studio/assets                              → 创建
 */
import { NextRequest, NextResponse } from 'next/server';
import { listAssets, createAsset } from '@/lib/studio/db';
import type { FsAssetCreateInput, FsAssetType } from '@/lib/studio/types';

/** GET /api/studio/assets */
export async function GET(req: NextRequest) {
  try {
    const scriptId = req.nextUrl.searchParams.get('scriptId') || undefined;
    const type = req.nextUrl.searchParams.get('type') as FsAssetType | null;
    const search = req.nextUrl.searchParams.get('search') || undefined;

    const assets = listAssets({ scriptId, type: type || undefined, search });
    return NextResponse.json({ success: true, assets });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/** POST /api/studio/assets */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scriptId, type, name, description, tags, thumbnail, source, data } = body;

    if (!scriptId) {
      return NextResponse.json({ success: false, error: 'scriptId is required' }, { status: 400 });
    }
    if (!type || !name?.trim()) {
      return NextResponse.json({ success: false, error: 'type and name are required' }, { status: 400 });
    }

    const input: FsAssetCreateInput = {
      scriptId,
      type,
      name: name.trim(),
      description,
      tags,
      thumbnail,
      source,
      data: data ?? {},
    };

    const asset = createAsset(input);
    return NextResponse.json({ success: true, asset }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
