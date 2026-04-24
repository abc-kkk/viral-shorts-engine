import { Router } from 'express';
import { generateAdvancedAsset } from '../automators/flow-automator.js';
import { enqueue } from '../middleware/serialQueue.js';

export const mediaRouter = Router();

/**
 * POST /api/media/generate
 * 
 * 通过 Google Flow 自动化生成图片或视频。
 * 
 * Body:
 *   - prompt: string (生成提示词)
 *   - model: 'Nano Banana Pro' | 'Veo 3.1' (模型选择)
 *   - referenceKeywords?: string[] (参考关键词，用于 @ 注入)
 *   - flowUrl?: string (Flow 项目地址，可覆盖环境变量)
 *   - fireAndForget?: boolean (触发后立即返回，不等待结果)
 *   - veoMode?: 'frame' | 'broll' (Veo 模式)
 * 
 * Response:
 *   - { success: boolean, url: string, fireAndForget?: boolean, error?: string }
 */
mediaRouter.post('/generate', async (req, res) => {
  try {
    const { prompt, model, referenceKeywords, flowUrl, fireAndForget, veoMode, passthroughMeta } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Missing prompt' });
      return;
    }
    if (!flowUrl) {
      res.status(400).json({ error: 'Missing flowUrl — each project must provide its own Flow project URL' });
      return;
    }

    const targetModel = model || 'Veo 3.1';
    console.log(`\n[Media Route] Received request. Model: ${targetModel}, Prompt: "${prompt.substring(0, 60)}..."`);

    const result = await enqueue(() =>
      generateAdvancedAsset(prompt, targetModel, referenceKeywords, flowUrl, fireAndForget, veoMode, passthroughMeta)
    );

    res.json(result);
  } catch (err: any) {
    console.error('[Media Route] Error:', err.message);
    res.status(500).json({ success: false, url: '', error: err.message });
  }
});
