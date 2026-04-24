import { NextResponse } from 'next/server';
import { deleteProject, renameProject } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/projects/[projectId] — 删除项目（移到回收站）
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const decoded = decodeURIComponent(projectId);
    const success = await deleteProject(decoded);
    
    if (!success) {
      return NextResponse.json({ error: '删除失败或项目不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[projectId] — 重命名项目
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const decoded = decodeURIComponent(projectId);
    const { newName } = await req.json();

    if (!newName || !newName.trim()) {
      return NextResponse.json({ error: '新名称不能为空' }, { status: 400 });
    }

    const newProjectId = await renameProject(decoded, newName.trim());
    return NextResponse.json({ success: true, newProjectId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
