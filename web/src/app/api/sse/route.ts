import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { asc, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const db = getDb();
  
  const stream = new ReadableStream({
    start(controller) {
      let isFetching = false;
      
      const interval = setInterval(async () => {
        if (isFetching) return;
        isFetching = true;
        try {
          let messages: any[] = [];
          db.transaction((tx) => {
              messages = tx.select().from(schema.inboxMessages).orderBy(asc(schema.inboxMessages.timestamp)).all();
              
              if (messages.length > 0) {
                  tx.delete(schema.inboxMessages).where(
                      inArray(schema.inboxMessages.id, messages.map((m: any) => m.id))
                  ).run();
              }
          });

          if (messages && messages.length > 0) {
            messages.forEach((msg: any) => {
              const item = {
                  ...msg,
                  meta: msg.meta ? JSON.parse(msg.meta) : undefined
              };
              controller.enqueue(`data: ${JSON.stringify(item)}\n\n`);
            });
          }
        } catch (e) {
          // Ignore DB errors during polling
        } finally {
          isFetching = false;
        }
      }, 500);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch(e){}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
