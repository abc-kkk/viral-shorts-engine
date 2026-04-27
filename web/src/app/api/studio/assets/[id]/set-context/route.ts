import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { scriptId, scriptTitle, targetType, charName, angleKey, shotId, frameType } = await request.json();

    if (!scriptId || !targetType) {
      return NextResponse.json({ error: 'Missing scriptId or targetType' }, { status: 400 });
    }

    const db = getDb();
    
    // Set active-context to trick the Chrome extension into dropping assets here
    const contextObj = {
      projectId: `projects/${scriptTitle}`, // 让它落在 工作空间/projects/xxx 下，与老版物理隔离
      targetType: targetType,
      index: 0,
      meta: {
        fsAssetId: shotId ? undefined : id, // 分镜帧图不需要 fsAssetId
        shotId: shotId || undefined,        // 分镜帧图用 shotId
        frameType: frameType || undefined,  // 'first' | 'last'
        charName: charName || undefined, // Required for characterImage to set anti-counterfeit name
        angleKey: angleKey || undefined  // 场景多角度：标识是哪个角度的图
      }
    };

    // Upsert active-context
    const existing = db.select().from(schema.systemStates).where(eq(schema.systemStates.key, 'active-context')).get();
    if (existing) {
        db.update(schema.systemStates).set({ value: JSON.stringify(contextObj) }).where(eq(schema.systemStates.key, 'active-context')).run();
    } else {
        db.insert(schema.systemStates).values({ key: 'active-context', value: JSON.stringify(contextObj) }).run();
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Set Context Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
