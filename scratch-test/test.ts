import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CDP_URL = 'http://127.0.0.1:9222';
const LABS_BASE_URL = 'https://labs.google/fx/api';
const API_BASE_URL = 'https://aisandbox-pa.googleapis.com/v1';

async function runTest() {
  console.log('Connecting to Chrome CDP...');
  let browser;
  try {
    const res = await fetch(`${CDP_URL}/json/version`);
    const data = await res.json();
    browser = await puppeteer.connect({
      browserWSEndpoint: data.webSocketDebuggerUrl,
      defaultViewport: null,
    });
  } catch (e) {
    console.error('Failed to connect to CDP');
    return;
  }

  const pages = await browser.pages();
  const flowPage = pages.find(p => p.url().includes('tools/flow/project'));
  
  if (!flowPage) return;

  const urlObj = new URL(flowPage.url());
  const pathParts = urlObj.pathname.split('/');
  const projectId = pathParts[pathParts.length - 1];

  const cookies = await flowPage.cookies();
  const stCookie = cookies.find(c => c.name === '__Secure-next-auth.session-token');
  const st = stCookie!.value;

  console.log('Getting AT...');
  const sessionRes = await fetch(`${LABS_BASE_URL}/auth/session`, {
    headers: { 'Cookie': `__Secure-next-auth.session-token=${st}` }
  });
  const at = (await sessionRes.json()).access_token;

  console.log('Getting reCAPTCHA token...');
  const recaptchaToken = await flowPage.evaluate(async () => {
    // @ts-ignore
    return await window.grecaptcha.enterprise.execute('6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV', { action: 'IMAGE_GENERATION' });
  });

  console.log('Generating 2 images at once...');
  const generateRes = await fetch(`${API_BASE_URL}/projects/${projectId}/flowMedia:batchGenerateImages`, {
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
      mediaGenerationContext: { batchId: "12345678-1234-1234-1234-123456789abc" },
      useNewMedia: true,
      requests: [
        {
          seed: Math.floor(Math.random() * 999999),
          imageModelName: "NARWHAL",
          imageAspectRatio: "IMAGE_ASPECT_RATIO_LANDSCAPE",
          structuredPrompt: { parts: [{ text: "a beautiful cinematic shot of a futuristic cyberpunk city with neon lights, 4k, hyper-detailed" }] },
          imageInputs: []
        },
        {
          seed: Math.floor(Math.random() * 999999),
          imageModelName: "NARWHAL",
          imageAspectRatio: "IMAGE_ASPECT_RATIO_LANDSCAPE",
          structuredPrompt: { parts: [{ text: "a beautiful cinematic shot of a futuristic cyberpunk city with neon lights, 4k, hyper-detailed" }] },
          imageInputs: []
        }
      ]
    })
  });

  const genData = await generateRes.json();
  
  if (genData.media && genData.media.length > 0) {
    console.log(`Got ${genData.media.length} images! Downloading...`);
    for (let i = 0; i < genData.media.length; i++) {
      const fifeUrl = genData.media[i].image?.generatedImage?.fifeUrl;
      if (fifeUrl) {
        const imgRes = await fetch(fifeUrl);
        const imgBuffer = await imgRes.arrayBuffer();
        fs.writeFileSync(`test_output_${i + 1}.jpg`, Buffer.from(imgBuffer));
        console.log(`✅ Saved image ${i + 1} to test_output_${i + 1}.jpg`);
      }
    }
  } else {
    console.error('No images returned.');
  }

  await browser.disconnect();
}

runTest().catch(console.error);
