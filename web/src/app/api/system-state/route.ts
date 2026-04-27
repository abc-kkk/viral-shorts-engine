import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const rows = db.select().from(schema.systemStates).all();
    const data: Record<string, string> = {};
    for (const row of rows) {
      data[row.key] = row.value;
    }
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const db = getDb();
    
    db.transaction((tx) => {
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string') {
          tx.insert(schema.systemStates)
            .values({ key, value })
            .onConflictDoUpdate({
              target: schema.systemStates.key,
              set: { value }
            })
            .run();
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
