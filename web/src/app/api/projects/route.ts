import { NextResponse } from 'next/server';
import { listProjects, createProject } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects — 列出所有项目
 */
export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json({ success: true, projects });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/projects — 立项（创建新项目）
 */
export async function POST(req: Request) {
  try {
    const { projectName } = await req.json();
    if (!projectName || !projectName.trim()) {
      return NextResponse.json({ error: '项目名称不能为空' }, { status: 400 });
    }

    const result = await createProject(projectName.trim());
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
