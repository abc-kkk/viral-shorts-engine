import { flowSubmitVideoTask } from './web/src/lib/utils/flowApi.ts';

// Mock fetch to just console.log the payload
global.fetch = async (url, options) => {
  console.log("URL:", url);
  console.log("Payload:", JSON.stringify(JSON.parse(options.body), null, 2));
  return {
    ok: true,
    json: async () => ({ operations: [{ operation: { name: "mock-task-id" } }] })
  };
};

async function test() {
  await flowSubmitVideoTask({
    projectId: "test-proj",
    at: "mock-token",
    recaptchaToken: "mock-recaptcha",
    prompt: "A beautiful cinematic shot of a dragon",
    aspectRatio: "VIDEO_ASPECT_RATIO_LANDSCAPE",
    startImageId: "media-123",
    endImageId: "media-456",
    modelKey: "veo_3_1_t2v_lite"
  });
}

test().catch(console.error);
