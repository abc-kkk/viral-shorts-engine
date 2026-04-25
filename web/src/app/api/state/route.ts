import { NextResponse } from 'next/server';
import { loadState, saveState } from '@/lib/db';
import { ProjectStateUpdateSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });

    const data = await loadState(projectId);
    return NextResponse.json({ success: true, data: data || {} });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });

    const body = await req.json();
    
    // Zod 严格验证
    const validationResult = ProjectStateUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('❌ [Zod Error] /api/state payload validation failed:', validationResult.error.format());
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid payload format',
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const success = await saveState(body, projectId);
    if (!success) throw new Error("Failed writing state to project.json.");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
