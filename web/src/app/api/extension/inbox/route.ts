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
    
    // Use transaction to fetch and delete atomically
    const data = await p.$transaction(async (tx: any) => {
        const messages = await tx.inboxMessage.findMany({
            orderBy: { timestamp: 'asc' }
        });
        
        if (messages.length > 0) {
            await tx.inboxMessage.deleteMany({
                where: {
                    id: { in: messages.map((m: any) => m.id) }
                }
            });
        }
        return messages;
    });
    
    // Parse meta JSON strings back to objects for the client
    const formattedData = data.map((msg: any) => ({
        ...msg,
        meta: msg.meta ? JSON.parse(msg.meta) : undefined
    }));
    
    return NextResponse.json({ success: true, data: formattedData }, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}
