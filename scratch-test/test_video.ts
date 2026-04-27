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

  console.log('Getting credits and tier...');
  const creditsRes = await fetch(`${API_BASE_URL}/credits`, {
    headers: { 'Authorization': `Bearer ${at}` }
  });
  const creditsData = await creditsRes.json();
  const userTier = creditsData.userPaygateTier || "PAYGATE_TIER_NOT_PAID";
  console.log(`User Tier: ${userTier}`);

  console.log('Getting reCAPTCHA token...');
  const recaptchaToken = await flowPage.evaluate(async () => {
    // @ts-ignore
    return await window.grecaptcha.enterprise.execute('6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV', { action: 'VIDEO_GENERATION' });
  });

  const sceneId = "scene-" + Date.now();
  console.log('Submitting video generation task...');
  const generateRes = await fetch(`${API_BASE_URL}/video:batchAsyncGenerateVideoText`, {
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
        userPaygateTier: userTier
      },
      mediaGenerationContext: { batchId: "12345678-1234-1234-1234-123456789abc" },
      useV2ModelConfig: true,
      requests: [
        {
          aspectRatio: "VIDEO_ASPECT_RATIO_LANDSCAPE",
          seed: Math.floor(Math.random() * 99999),
          textInput: { structuredPrompt: { parts: [{ text: "A cinematic slow pan shot of a futuristic neon city in the rain, 4k" }] } },
          videoModelKey: "veo_3_1_t2v_lite",
          metadata: { sceneId: sceneId }
        }
      ]
    })
  });

  if (!generateRes.ok) {
      console.error("Failed to submit video task:", await generateRes.text());
      await browser.disconnect();
      return;
  }

  const genData = await generateRes.json();
  const operations = genData.operations;

  if (!operations || operations.length === 0) {
      console.error("No operations returned. Data:", genData);
      await browser.disconnect();
      return;
  }

  console.log(`Task submitted successfully! Task ID: ${operations[0].operation.name}`);
  console.log('Polling for completion (this may take 1-2 minutes)...');

  let completed = false;
  let attempt = 0;
  while (!completed && attempt < 40) {
      attempt++;
      await new Promise(r => setTimeout(r, 5000)); // wait 5s

      const pollRes = await fetch(`${API_BASE_URL}/video:batchCheckAsyncVideoGenerationStatus`, {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${at}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              operations: [{ operation: { name: operations[0].operation.name } }]
          })
      });

      if (!pollRes.ok) {
          console.error("Poll failed:", await pollRes.text());
          continue;
      }

      const pollData = await pollRes.json();
      const status = pollData.operations?.[0]?.status;
      
      process.stdout.write(`Attempt ${attempt}: Status = ${status}\n`);

      if (status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
          completed = true;
          const metadata = pollData.operations[0].operation?.metadata;
          if (metadata) {
              console.log('\nVideo Generation SUCCESSFUL!');
              fs.writeFileSync('test_video_result.json', JSON.stringify(metadata, null, 2));
              console.log('Saved video metadata to test_video_result.json');
              
              const rawDataStr = metadata['@type'] ? JSON.stringify(metadata) : '';
              const match = rawDataStr.match(/https:\/\/flow-content\.google\/video\/[^"]+/);
              if (match) {
                  console.log('Found Video URL:', match[0]);
              }
          }
      } else if (status === 'MEDIA_GENERATION_STATUS_FAILED') {
          completed = true;
          console.error('\nVideo Generation FAILED!');
          console.error(JSON.stringify(pollData.operations[0], null, 2));
      }
  }

  if (!completed) {
      console.log('Polling timed out.');
  }

  await browser.disconnect();
}

runTest().catch(console.error);
