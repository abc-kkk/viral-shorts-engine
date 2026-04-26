/**
 * Freedom Studio — 单个资产 API 路由
 * GET    /api/studio/assets/[id]   获取单个资产
 * PATCH  /api/studio/assets/[id]   更新资产
 * DELETE /api/studio/assets/[id]   删除资产
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAssetById, updateAsset, deleteAsset } from '@/lib/studio/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = getAssetById(id);
    if (!asset) {
      return NextResponse.json({ error: '资产不存在' }, { status: 404 });
    }
    return NextResponse.json(asset);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const asset = updateAsset(id, body);
    if (!asset) {
      return NextResponse.json({ error: '资产不存在' }, { status: 404 });
    }
    return NextResponse.json(asset);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = deleteAsset(id);
    if (!success) {
      return NextResponse.json({ error: '资产不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
