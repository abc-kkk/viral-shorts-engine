import { chromium } from 'playwright-core';

/**
 * AI Studio TTS Automator (Playwright CDP)
 * 
 * 返回 Base64 编码的音频数据，由调用方自行决定存储位置。
 */
export async function generateTTS(
  dialogueText: string,
  voiceName: string = "Zephyr"
): Promise<{ success: boolean; audioBase64: string; mimeType: string; error?: string }> {
  const CDP_URL = process.env.CHROME_CDP_URL;
  const AISTUDIO_URL = 'https://aistudio.google.com/generate-speech?model=gemini-3.1-flash-tts-preview';

  if (!CDP_URL) {
     return { success: false, audioBase64: '', mimeType: '', error: "Missing CHROME_CDP_URL in env." };
  }

  console.log(`[AIStudio Automator] Connecting to Chrome CDP at ${CDP_URL}...`);
  
  try {
    const browser = await chromium.connectOverCDP(CDP_URL);
    const defaultContext = browser.contexts()[0];
    
    // Find an existing AI Studio page
    let page = defaultContext.pages().find(p => p.url().includes('generate-speech'));
    
    if (!page) {
      console.log(`[AIStudio Automator] Navigating to ${AISTUDIO_URL} in a new tab...`);
      page = await defaultContext.newPage();
      await page.goto(AISTUDIO_URL, { waitUntil: 'domcontentloaded' });
    } else {
      console.log(`[AIStudio Automator] Reusing existing tab: ${page.url()}`);
      // 取消 bringToFront()，让潜入动作变成真正的“后台绝密潜入”，不再打断导演的思路夺走屏幕焦点
      if (!page.url().includes('model=gemini-3.1-flash-tts-preview')) {
         await page.goto(AISTUDIO_URL, { waitUntil: 'domcontentloaded' });
      }
    }
    
    // 1. Wait for page to be ready
    console.log(`[AIStudio Automator] Wait for text area...`);
    await page.waitForSelector('ms-autosize-textarea textarea', { timeout: 30000 });
    const editor = page.locator('ms-autosize-textarea textarea').last();

    // 2. Select Voice if provided
    if (voiceName) {
      console.log(`[AIStudio Automator] Attempting to select Voice: ${voiceName}`);
      
      // Open the speaker settings panel first
      const speechBlock = page.locator('ms-speech-block').last();
      const speakerBtn = speechBlock.locator('.block-header .chip-row button').first();
      
      if (await speakerBtn.count() > 0) {
          console.log(`[AIStudio Automator] Opening speaker settings panel...`);
          await speakerBtn.click({ timeout: 5000 });
          await page.waitForSelector('ms-speaker-settings-panel', { state: 'visible', timeout: 5000 });
          await page.waitForTimeout(800); // Wait for slide-in animation
      }

      const voiceCard = page.locator(`css=.voice-card[data-voice-name="${voiceName}"]`).first();
      if (await voiceCard.count() > 0) {
          await voiceCard.scrollIntoViewIfNeeded();
          const isSelected = await voiceCard.evaluate((node) => node.classList.contains('selected'));
          if (!isSelected) {
             console.log(`[AIStudio Automator] Clicking voice card: ${voiceName}`);
             await voiceCard.click({ timeout: 5000 });
             await page.waitForTimeout(500);
          } else {
             console.log(`[AIStudio Automator] Voice ${voiceName} is already selected.`);
          }
      } else {
          console.log(`[AIStudio Automator] Voice ${voiceName} not found, continuing with default.`);
      }
      
      // Close the side panel so it doesn't block other UI elements like the Run button
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // 3. Clear text box and input new dialogue
    // Preserve English emotion tags for Gemini TTS (e.g., [laugh], [sad]), 
    // but strip out Chinese stage directions (e.g., 【走到窗前】, [叹气]) that Gemini doesn't support
    const cleanedDialogueText = dialogueText
        .replace(/\[\s*excited\s*\]/gi, '[happy]') // explicitly convert the buggy [excited] tag to [happy] silently
        .replace(/【.*?】/g, '') // Strip Chinese bold brackets
        .replace(/\[[^\]]*[\u4e00-\u9fa5]+[^\]]*\]/g, '') // Strip standard brackets if they contain Chinese chars
        .replace(/\([^)]*[\u4e00-\u9fa5]+[^)]*\)/g, '') // Strip parenthesis if they contain Chinese chars
        .trim();
        
    console.log(`[AIStudio Automator] Inputting dialogue: ${cleanedDialogueText}`);
    await page.keyboard.press('Escape'); // close any modals
    await editor.click({ force: true });
    await page.keyboard.press('Meta+A'); // Select all (Mac)
    await page.keyboard.press('Backspace'); // Delete
    await page.waitForTimeout(100);
    
    // Some complex editors need strict text filling
    await editor.fill(cleanedDialogueText || dialogueText); // Fallback to original if stripping empties it
    await page.waitForTimeout(500);

    // 4. Click Run Button
    console.log(`[AIStudio Automator] Hitting Run...`);
    const runBtn = page.locator('ms-run-button button').first();
    
    // Wait slightly to let the input register
    await page.waitForTimeout(500);
    await runBtn.click({ timeout: 5000 });

    // 5. Wait for Generation to Complete
    console.log(`[AIStudio Automator] Waiting for generation (Tracking running state)...`);
    
    // Stage A: Wait for the run button to become disabled (means generation started)
    try {
        await page.waitForFunction(() => {
            const btn = document.querySelector('ms-run-button button');
            return btn?.hasAttribute('disabled') || btn?.getAttribute('aria-disabled') === 'true';
        }, null, { timeout: 5000 });
        console.log(`[AIStudio Automator] Generation started (Button disabled).`);
    } catch (e) {
        console.log(`[AIStudio Automator] Run button didn't disable quickly... continuing...`);
        await page.waitForTimeout(3000);
    }

    // Stage B: Wait for the run button to become enabled again (means generation finished or ERRORED)
    const runFinishedPromise = page.waitForFunction(() => {
        const btn = document.querySelector('ms-run-button button');
        return btn && (!btn.hasAttribute('disabled') && btn.getAttribute('aria-disabled') !== 'true');
    }, null, { timeout: 60000 });

    // Stage C: Listen for Google's Prohibited Use error toast
    const errorToastPromise = page.locator('text=Generative AI Prohibited Use policy').waitFor({ state: 'visible', timeout: 60000 }).then(() => 'POLICY_ERROR');
    const genericErrorPromise = page.locator('text=The prompt could not be submitted').waitFor({ state: 'visible', timeout: 60000 }).then(() => 'GENERIC_ERROR');

    const raceResult = await Promise.race([runFinishedPromise, errorToastPromise, genericErrorPromise]);

    if (raceResult === 'POLICY_ERROR' || raceResult === 'GENERIC_ERROR') {
        throw new Error("AI Studio Error: Triggered Google Generative AI Prohibited Use policy (Safety filter blocked the prompt).");
    }

    console.log(`[AIStudio Automator] Generation finished! Grabbing the latest audio track...`);
    
    // Because multiple generations pile up, we MUST select the LAST download button
    const downloadBtn = page.locator('ms-music-player button.download-button').last();
    await downloadBtn.waitFor({ state: 'visible', timeout: 10000 });

    // 6. Setup Download Listener and Trigger Download
    console.log(`[AIStudio Automator] Intercepting Download...`);

    // Wait for download event
    const downloadPromise = page.waitForEvent('download');
    await downloadBtn.click();
    const download = await downloadPromise;

    // Stream download into memory buffer (不写本地文件，由调用方自行决定存储)
    const stream = await download.createReadStream();
    if (!stream) throw new Error("Received empty download stream from browser.");
    
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);
    const audioBase64 = audioBuffer.toString('base64');
    
    console.log(`[AIStudio Automator] Audio captured in memory (${(audioBuffer.length / 1024).toFixed(1)} KB)`);

    return { success: true, audioBase64, mimeType: 'audio/wav' };

  } catch (err: any) {
    console.error("[AIStudio Automator] Error generating TTS:", err);
    return { success: false, audioBase64: '', mimeType: '', error: err.message };
  }
}
