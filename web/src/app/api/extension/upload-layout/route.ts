import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { image, name, flowUrl } = await req.json();
    const gatewayUrl = process.env.AI_GATEWAY_URL || 'http://localhost:3002';
    
    const res = await fetch(`${gatewayUrl}/api/media/upload-layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, name, flowUrl })
    });
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
