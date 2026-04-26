import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getWorkspacePath } from '@/lib/db';

/**
 * 布局预设管理 API
 * 存储在工作空间的 _layouts/ 目录下，每个预设是一个 JSON 文件
 */

function getLayoutsDir(): string {
  const ws = getWorkspacePath();
  const dir = path.join(ws, '_layouts');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

interface LayoutPreset {
  id: string;
  name: string;
  objects: any[];
  image: string; // base64 PNG 截图
  bgImage?: string; // 用户上传的 2D 底图
  aspectRatio?: string; // 画布画幅比例
  createdAt: string;
  updatedAt: string;
}

// GET - 列出所有布局预设
export async function GET() {
  try {
    const dir = getLayoutsDir();
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const presets: LayoutPreset[] = [];

    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
        presets.push(data);
      } catch { /* skip corrupted files */ }
    }

    // 按更新时间倒序
    presets.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

    return NextResponse.json({ success: true, presets });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST - 保存/更新布局预设
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, objects, image, id, bgImage, aspectRatio } = body;

    if (!name || !objects || !image) {
      return NextResponse.json({ success: false, error: '缺少必要参数 (name, objects, image)' }, { status: 400 });
    }

    const dir = getLayoutsDir();
    const presetId = id || `layout_${Date.now()}`;
    const filePath = path.join(dir, `${presetId}.json`);

    const isUpdate = fs.existsSync(filePath);
    const existing = isUpdate ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : null;

    const preset: LayoutPreset = {
      id: presetId,
      name,
      objects,
      image,
      bgImage,
      aspectRatio,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(preset, null, 2), 'utf-8');
    console.log(`[Layouts] ${isUpdate ? 'Updated' : 'Created'} layout preset: ${presetId} (${name})`);

    return NextResponse.json({ success: true, preset });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE - 删除布局预设
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 id 参数' }, { status: 400 });
    }

    const dir = getLayoutsDir();
    const filePath = path.join(dir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Layouts] Deleted layout preset: ${id}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
