import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

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
    const p = getPrisma();
    const state = await p.systemState.findUnique({ where: { key: 'active-context' } });
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
    const p = getPrisma();
    await p.systemState.upsert({
      where: { key: 'active-context' },
      create: { key: 'active-context', value: JSON.stringify(body) },
      update: { value: JSON.stringify(body) },
    });
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}
