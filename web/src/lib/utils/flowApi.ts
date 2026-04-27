export interface FlowGenerateImageParams {
  projectId: string;
  at: string;
  recaptchaToken: string;
  prompts: string[]; // 数组长度即为生成的数量
  aspectRatio: string;
  modelName?: string;
  referenceImageIds?: string[]; // 上传后获取的 mediaId
}

export interface FlowGenerateVideoParams {
  projectId: string;
  at: string;
  recaptchaToken: string;
  prompt?: string;
  aspectRatio: string;
  startImageId?: string;
  endImageId?: string;
  modelKey?: string;
}

const API_BASE = 'https://aisandbox-pa.googleapis.com/v1';

/**
 * 核心：图片生成接口 (支持多并发、画幅、参考图)
 */
export async function flowGenerateImages(params: FlowGenerateImageParams) {
  const { projectId, at, recaptchaToken, prompts, aspectRatio, referenceImageIds = [], modelName = "NARWHAL" } = params;

  const imageInputs = referenceImageIds.map(id => ({
    name: id,
    imageInputType: "IMAGE_INPUT_TYPE_REFERENCE"
  }));

  // 构建 requests 数组，prompts 有几个就生成几张
  const requests = prompts.map(prompt => ({
    seed: Math.floor(Math.random() * 999999),
    imageModelName: modelName,
    imageAspectRatio: aspectRatio,
    structuredPrompt: { parts: [{ text: prompt }] },
    imageInputs: imageInputs
  }));

  const res = await fetch(`${API_BASE}/projects/${projectId}/flowMedia:batchGenerateImages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${at}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      clientContext: {
        recaptchaContext: { token: recaptchaToken, applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB" },
        sessionId: ";" + Date.now(),
        projectId: projectId,
        tool: "PINHOLE"
      },
      mediaGenerationContext: { batchId: crypto.randomUUID() },
      useNewMedia: true,
      requests
    })
  });

  if (!res.ok) throw new Error(`Image Generation Failed: ${await res.text()}`);
  return await res.json();
}

/**
 * 核心：视频生成接口 (支持首尾帧)
 */
export async function flowSubmitVideoTask(params: FlowGenerateVideoParams) {
  const { projectId, at, recaptchaToken, prompt, aspectRatio, startImageId, endImageId, modelKey = "veo_3_1_t2v_lite" } = params;

  const requestObj: any = {
    aspectRatio: aspectRatio,
    seed: Math.floor(Math.random() * 999999),
    metadata: { sceneId: "scene-" + Date.now() }
  };

  const isI2V = !!startImageId;
  const endpoint = isI2V ? 'video:batchAsyncGenerateVideoStartAndEndImage' : 'video:batchAsyncGenerateVideoText';

  if (isI2V) {
    requestObj.videoModelKey = modelKey.replace('_t2v_', '_i2v_');
    if (startImageId) requestObj.startImage = { mediaId: startImageId };
    if (endImageId) requestObj.endImage = { mediaId: endImageId };
    if (prompt) requestObj.textInput = { structuredPrompt: { parts: [{ text: prompt }] } };
  } else {
    requestObj.videoModelKey = modelKey;
    requestObj.textInput = { structuredPrompt: { parts: [{ text: prompt }] } };
  }

  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${at}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      clientContext: {
        recaptchaContext: { token: recaptchaToken, applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB" },
        sessionId: ";" + Date.now(),
        projectId: projectId,
        tool: "PINHOLE",
        userPaygateTier: "PAYGATE_TIER_TWO" // 可通过接口动态获取
      },
      mediaGenerationContext: { batchId: crypto.randomUUID() },
      useV2ModelConfig: true,
      requests: [requestObj]
    })
  });

  if (!res.ok) throw new Error(`Video Task Submission Failed: ${await res.text()}`);
  return await res.json();
}

/**
 * 核心：视频状态轮询接口
 */
export async function flowPollVideoStatus(at: string, taskId: string) {
  const res = await fetch(`${API_BASE}/video:batchCheckAsyncVideoGenerationStatus`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${at}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      operations: [{ operation: { name: taskId } }]
    })
  });
  if (!res.ok) throw new Error(`Poll Failed: ${await res.text()}`);
  return await res.json();
}

/**
 * 核心：上传图片，换取 mediaId
 */
export async function flowUploadImage(projectId: string, at: string, imageBuffer: Buffer, aspectRatio: string) {
  const mimeType = 'image/jpeg';
  const fileName = `upload_${Date.now()}.jpg`;
  const base64Data = imageBuffer.toString('base64');

  const res = await fetch(`${API_BASE}/flow/uploadImage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${at}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      clientContext: {
        projectId,
        tool: 'PINHOLE'
      },
      fileName,
      mimeType,
      imageBytes: base64Data,
      isUserUploaded: true,
      isHidden: false
    })
  });

  if (!res.ok) throw new Error(`Upload Failed: ${await res.text()}`);
  const data = await res.json();
  return data.media?.name; // This is the mediaId
}
