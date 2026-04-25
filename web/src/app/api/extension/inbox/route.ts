import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { asc, inArray } from 'drizzle-orm';

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
    
    // Use transaction to fetch and delete atomically
    let messages: any[] = [];
    db.transaction((tx) => {
        messages = tx.select().from(schema.inboxMessages).orderBy(asc(schema.inboxMessages.timestamp)).all();
        
        if (messages.length > 0) {
            tx.delete(schema.inboxMessages).where(
                inArray(schema.inboxMessages.id, messages.map((m: any) => m.id))
            ).run();
        }
    });
    
    // Parse meta JSON strings back to objects for the client
    const formattedData = messages.map((msg: any) => ({
        ...msg,
        meta: msg.meta ? JSON.parse(msg.meta) : undefined
    }));
    
    return NextResponse.json({ success: true, data: formattedData }, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}
