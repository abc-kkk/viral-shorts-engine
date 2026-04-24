import { eventEmitter } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const listener = (data: any) => {
        try {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch (e) {
          console.error('[SSE] Failed to enqueue data', e);
        }
      };

      // Register listener
      eventEmitter.on('inbox', listener);

      // Cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        eventEmitter.off('inbox', listener);
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
