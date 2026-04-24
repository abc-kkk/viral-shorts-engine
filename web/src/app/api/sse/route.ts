import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const inboxPath = path.join(process.cwd(), 'tmp', 'inbox.json');
      
      const interval = setInterval(() => {
        try {
          if (fs.existsSync(inboxPath)) {
            const dataStr = fs.readFileSync(inboxPath, 'utf-8');
            if (!dataStr) return;
            const data = JSON.parse(dataStr);
            if (data && data.length > 0) {
              data.forEach((item: any) => {
                controller.enqueue(`data: ${JSON.stringify(item)}\n\n`);
              });
              // Clear inbox after sending
              fs.writeFileSync(inboxPath, '[]');
            }
          }
        } catch (e) {
          // Ignore read/parse errors during concurrent writes
        }
      }, 500); // Super fast 500ms polling under the hood

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
