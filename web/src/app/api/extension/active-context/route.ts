import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const db = getDb();
    const state = db.select().from(schema.systemStates).where(eq(schema.systemStates.key, 'active-context')).get();
    if (!state) {
      return NextResponse.json({ success: true, data: null }, { headers: corsHeaders });
    }
    const data = JSON.parse(state.value);
    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getDb();
    db.insert(schema.systemStates).values({
      key: 'active-context',
      value: JSON.stringify(body)
    }).onConflictDoUpdate({
      target: schema.systemStates.key,
      set: { value: JSON.stringify(body) }
    }).run();
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}
