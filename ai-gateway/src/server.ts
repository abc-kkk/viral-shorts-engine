import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { textRouter } from './routes/text.js';
import { mediaRouter } from './routes/media.js';
import { speechRouter } from './routes/speech.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4100;

// ========================================
// Middleware
// ========================================

app.use(cors({
  origin: true, // 允许所有来源（本地开发场景）
}));

app.use(express.json({ limit: '10mb' }));

// 可选的简单密钥鉴权
const API_SECRET = process.env.API_SECRET;
if (API_SECRET) {
  app.use((req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${API_SECRET}`) {
      res.status(401).json({ error: 'Unauthorized: Invalid or missing API_SECRET.' });
      return;
    }
    next();
  });
  console.log(`🔒 API authentication enabled.`);
}

// ========================================
// Health Check
// ========================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-gateway',
    uptime: process.uptime(),
    cdpUrl: process.env.CHROME_CDP_URL || 'NOT SET',
  });
});

// ========================================
// Routes
// ========================================

app.use('/api/text', textRouter);
app.use('/api/media', mediaRouter);
app.use('/api/speech', speechRouter);

// ========================================
// Global Error Handler
// ========================================

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[ai-gateway] Unhandled Error:`, err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ========================================
// Start
// ========================================

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 ========================================`);
  console.log(`   AI Gateway is running on port ${PORT} (Bound to 127.0.0.1 for security)`);
  console.log(`   http://127.0.0.1:${PORT}/health`);
  console.log(`   CDP Target: ${process.env.CHROME_CDP_URL || 'http://127.0.0.1:9222'}`);
  console.log(`========================================\n`);
});
