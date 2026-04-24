import { getPrisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const p = getPrisma();
  
  const stream = new ReadableStream({
    start(controller) {
      let isFetching = false;
      
      const interval = setInterval(async () => {
        if (isFetching) return;
        isFetching = true;
        try {
          const data = await p.$transaction(async (tx) => {
              const messages = await tx.inboxMessage.findMany({
                  orderBy: { timestamp: 'asc' }
              });
              
              if (messages.length > 0) {
                  await tx.inboxMessage.deleteMany({
                      where: {
                          id: { in: messages.map(m => m.id) }
                      }
                  });
              }
              return messages;
          });

          if (data && data.length > 0) {
            data.forEach((msg) => {
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
