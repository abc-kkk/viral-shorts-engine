import { chromium } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

/**
 * 通用 UI 靶向点击助手：解决 Playwright 模糊匹配经常“点歪”（比如带 图片 俩字的误点）的行业通病！
 * 优先进行 100% 精确文本匹配（无视多余空格/包裹器），仅当失败时回退到安全备用探测。
 */
async function clickExactButton(root: Page | Locator, exactTexts: string[], fallbackTexts: string[] = [], timeout = 5000) {
    // 强制使用极其严苛的锚定正则，绝杀所有“部分包含”引起的歧义
    // [新发现]: Google 使用 Material Symbols，会在 innerText 头部打出如 "image\n" 或 "videocam\n" 的图标文字 ligature
    // 因此正则允许头部包含纯英文字母构成的图标文本前缀
    const exactRegex = new RegExp(`^(?:[a-z_]+[\\s\\n]+)?(${exactTexts.join('|')})\\s*$`, 'i');
    let target = root.locator('button').filter({ hasText: exactRegex }).first();
    
    if (await target.count() === 0 && fallbackTexts.length > 0) {
        // 如果严格匹配阵亡（Google UI 换名/嵌异形节点），开启防重名的备用探测
        const fallbackRegex = new RegExp(`(${fallbackTexts.join('|')})`, 'i');
        target = root.locator('button').filter({ hasText: fallbackRegex }).last(); // last 以规避顶部导航栏同名按钮
    }
    
    // 强制使用 force: true 绕过 Google Flow 偶尔出现的“多个 Popover 幽灵重叠导致无法获得指针事件”的 React Bug
    try {
        await target.click({ timeout, force: true });
    } catch (e: any) {
        throw new Error(`[clickExactButton] Failed to click '[${exactTexts.join(', ')}]': ${e.message}`);
    }
}

/**
 * 通用风控及失败拦截器组
 * 监测页面是否出现“异常活动”或“加载媒体失败”的提示，返回待放入 Promise.race 的巡检任务。
 */
function getFailureCheckers(page: Page, timeoutMs: number) {
    return [
        // 核心反爬：一旦检测到风控，瞬间截获并进入重试循环，不要干等！
        page.waitForFunction(() => {
            const text = document.body.innerText.toLowerCase();
            return text.includes('unusual activity') || text.includes('异常活动') || text.includes('异常');
        }, null, { timeout: timeoutMs }).then(() => 'banned' as const).catch(() => 'timeout' as const),
        // 生成失败拦截：如果 Google 云端加载失败，立刻拦截进入重试循环！
        page.waitForFunction(() => {
            const text = document.body.innerText.toLowerCase();
            return text.includes('加载媒体内容时') || text.includes('出了点问题') || text.includes('problem loading media');
        }, null, { timeout: timeoutMs }).then(() => 'failed' as const).catch(() => 'timeout' as const)
    ];
}

/**
 * Flow API Automator (Playwright CDP)
 * Ensure your Chrome is running with Remote Debugging enabled.
 */
export async function generateAdvancedAsset(
  prompt: string, 
  model: 'Nano Banana Pro' | 'Veo 3.1',
  referenceKeywords?: string[],
  flowUrl?: string,
  fireAndForget?: boolean,
  veoMode?: 'frame' | 'broll',
  passthroughMeta?: any
): Promise<{ success: boolean; url: string; error?: string; fireAndForget?: boolean; passthroughMeta?: any }> {
  // Use the port you exposed via chrome://inspect/#remote-debugging
  const CDP_URL = process.env.CHROME_CDP_URL;
  const FLOW_URL = flowUrl; // 必须由调用方传入，因为每个项目的 Flow 地址不同

  if (!CDP_URL) {
     return { success: false, url: '', error: "Missing CHROME_CDP_URL in ai-gateway env.", passthroughMeta };
  }
  if (!FLOW_URL) {
     return { success: false, url: '', error: "Missing flowUrl parameter. Each project must provide its own Flow project URL.", passthroughMeta };
  }

  console.log(`[Flow Automator] Connecting to Chrome CDP at ${CDP_URL}...`);
  
  try {
    const browser = await chromium.connectOverCDP(CDP_URL);
    const defaultContext = browser.contexts()[0];
    
    // Find an existing Flow page (accounting for /zh/ localization slugs)
    let page = defaultContext.pages().find(p => p.url().includes('labs.google/fx') && p.url().includes('tools/flow'));
    
    if (!page) {
      console.log(`[Flow Automator] Navigating to ${FLOW_URL} in a new tab...`);
      page = await defaultContext.newPage();
      await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded' });
    } else {
      console.log(`[Flow Automator] Reusing existing tab: ${page.url()}`);
      // 取消 bringToFront()，不再夺走焦点，同时也有助于规避某些由于焦点突变引起的反爬策略
      
      // Extract project IDs to compare, avoiding false redirects due to /zh/ vs /en/
      const currentProjectId = page.url().split('/project/')[1]?.split('?')[0];
      const targetProjectId = FLOW_URL.split('/project/')[1]?.split('?')[0];
      
      if (currentProjectId && targetProjectId && currentProjectId !== targetProjectId) {
         await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded' });
      }
    }
    
    const MAX_RETRIES = 5;
    let finalResultUrl = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 1) {
            console.log(`[Flow Automator] Google IP blocking detected! Retry Attempt ${attempt}/${MAX_RETRIES}... Reloading...`);
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(5000); // 冷却并等待页面重置
        }

        // 1. Selector logic for the Model
        console.log(`[Flow Automator] Selecting model: ${model}`);
        
        // Flow uses a Slate.js React rich-text editor (not a standard textarea)
        // We target the overarching contenteditable="true" container
        await page.waitForSelector('[contenteditable="true"]:visible', { timeout: 30000 });
        const editor = page.locator('[contenteditable="true"]:visible').last();

        // Check current button text to skip unnecessary model switching (but handle Veo mode enforcement)
        const dropdownBtn = page.locator('button[aria-haspopup="menu"]').last();
        const currentBtnText = await dropdownBtn.innerText().catch(() => '');
        
        let shouldSwitch = true;
        if (model === 'Nano Banana Pro' && (currentBtnText.toLowerCase().includes('image') || currentBtnText.toLowerCase().includes('banana') || currentBtnText.includes('图片') || currentBtnText.includes('图像'))) {
            console.log(`[Flow Automator] UI already set to Image mode. Skipping switch.`);
            shouldSwitch = false;
        } else if (model === 'Veo 3.1' && (currentBtnText.toLowerCase().includes('video') || currentBtnText.toLowerCase().includes('veo') || currentBtnText.includes('视频'))) {
            const hasStartBox = await page.getByText('Start', { exact: true }).or(page.getByText('起始', { exact: true })).count() > 0;
            
            if (veoMode === 'broll') {
                if (!hasStartBox) {
                    console.log(`[Flow Automator] UI already correctly set to Video B-Roll mode. Skipping switch.`);
                    shouldSwitch = false;
                } else {
                    console.log(`[Flow Automator] UI is in Video mode but currently in Frame mode. Need to switch to B-Roll.`);
                }
            } else {
                if (hasStartBox) {
                    console.log(`[Flow Automator] UI already correctly set to Video Frame mode. Skipping switch.`);
                    shouldSwitch = false;
                } else {
                    console.log(`[Flow Automator] UI is in Video mode but NOT in Frame mode! Will manually switch.`);
                }
            }
        }
        
        if (shouldSwitch) {
            console.log(`[Flow Automator] Opening settings dropdown to ensure ${model} and its sub-modes...`);
            await dropdownBtn.click({ timeout: 5000 });
            await page.waitForTimeout(1000); // Give Radix popper time to open
            
            // Limit searches to the currently open Popper/Dialog modal to avoid clicking background buttons
            const openPopover = page.locator('[role="dialog"], [role="menu"], [data-radix-popper-content-wrapper]').last();
            
            if (model === 'Nano Banana Pro') {
                console.log(`[Flow Automator] Clicking 'Image' tab...`);
                // 一招毙命：抛弃所有文本匹配，直接利用 Radix UI 的底层后缀规避一切幽灵组件和字体前缀
                await page.locator('button[id$="-trigger-IMAGE"]').last().click({ timeout: 5000, force: true }).catch((e)=>{
                     console.warn("[Flow Automator] WARNING: Image tab click failed!", e.message);
                });
            } else {
                console.log(`[Flow Automator] Clicking 'Video' tab...`);
                await page.locator('button[id$="-trigger-VIDEO"]').last().click({ timeout: 5000, force: true }).catch((e)=>{
                     console.warn("[Flow Automator] WARNING: Video tab click failed!", e.message);
                });
                await page.waitForTimeout(500);
                if (veoMode === 'broll') {
                    console.log(`[Flow Automator] Ensuring 'B-Roll' (素材) mode is active for Veo 3.1...`);
                    try {
                        await page.locator('button[id$="-trigger-VIDEO_B_ROLL"], button[id$="-trigger-VIDEO_BROLL"]').last().click({ timeout: 2000, force: true });
                    } catch (e: any) {
                        console.log(`[Flow Automator] B-Roll mode button not found or already active. (${e.message})`);
                    }
                } else {
                    console.log(`[Flow Automator] Ensuring 'Frame' mode is active for Veo 3.1...`);
                    try {
                        await page.locator('button[id$="-trigger-VIDEO_FRAMES"]').last().click({ timeout: 2000, force: true });
                    } catch (e: any) {
                        console.log(`[Flow Automator] Frame mode button not found or already active. (${e.message})`);
                    }
                }
            }
            await page.waitForTimeout(500);
            await page.keyboard.press('Escape'); // Close menu in case it didn't auto-close
        }
        
        // Remember what is currently present so we know when generation finishes
        const currentTopMedia = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img')).map(i => i.src).filter(Boolean);
            const vids = Array.from(document.querySelectorAll('video')).map(v => v.src || v.querySelector('source')?.src).filter(Boolean);
            return {
               images: imgs,
               videos: vids
            };
        });
        
        // 2. Input the Prompt
        console.log(`[Flow Automator] Inputting prompt: ${prompt}`);
        
        // For Slate.js, the most robust way is clicking to focus, then native typing
        // Press Escape to close any lingering Radix dropdown that might intercept clicks
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        
        // 2 & 3. Inject References FIRST (via @ mention), then insert Prompt
        // 这样可以让模型首先锚定参考图为主体，然后再执行运镜或构图指令！
        await editor.click({ force: true });
        await page.keyboard.press('Meta+A'); // Select all previous text
        await page.keyboard.press('Backspace'); // Delete it
        await page.waitForTimeout(100);

        // 解析提取出行内芯片词
        const inlineTokenRegexObj = /\{@([^{}]+)\}/g;
        const inlineChips = new Set<string>();
        let regexMatch;
        while ((regexMatch = inlineTokenRegexObj.exec(prompt)) !== null) {
            inlineChips.add(regexMatch[1]);
        }

        // 把已经在正文里的角色从开头预加载名单中剔除
        const frontLoadKeywords = (referenceKeywords || []).filter(kw => !inlineChips.has(kw));

        if (frontLoadKeywords.length > 0) {
            console.log(`[Flow Automator] Injecting ${frontLoadKeywords.length} global reference(s) FIRST via @ mention...`);

            for (let i = 0; i < frontLoadKeywords.length; i++) {
                const keyword = frontLoadKeywords[i];
                console.log(`[Flow Automator] Embed via @ mention [${i+1}/${referenceKeywords.length}]: ${keyword.substring(0,30)}...`);
                
                // 敲击 @ 呼出悬浮搜索框
                await page.keyboard.type('@');
                await page.waitForTimeout(1000); 

                const searchTerm = keyword.startsWith('http') ? keyword.split('/').pop()?.split('?')[0] || keyword : keyword;
                const finalSearchTerm = searchTerm.substring(0, 50);

                const searchPop = page.getByPlaceholder(/Search|搜索/i).last();
                if (await searchPop.isVisible()) {
                    await searchPop.click();
                    await page.keyboard.insertText(finalSearchTerm);
                } else {
                    // 如果没有独立搜索框，说明 @ 后面的文字自带筛选功能
                    await page.keyboard.insertText(finalSearchTerm);
                }
                
                await page.waitForTimeout(800); // 等待搜索结果列表更新完毕

                // 优先尝试精确点击匹配名称的那一项，解决模糊匹配乱序导致点错资产的问题
                try {
                    await page.getByText(finalSearchTerm, { exact: true }).last().click({ timeout: 1000 });
                } catch(e) {
                    // Fallback: 如果由于 DOM 结构奇特找不到精确文本，则回落到默认回车
                    await page.keyboard.press('Enter');
                }
                await page.waitForTimeout(800);
            }
        }

        // 4. Parse the prompt for `{@keyword}` inline tokens and inject them grammatically!
        const inlineTokenRegex = /\{@([^{}]+)\}/g;
        let lastIndex = 0;
        let match;
        
        while ((match = inlineTokenRegex.exec(prompt)) !== null) {
            // Type the regular text prefix BEFORE the token
            const textPrefix = prompt.substring(lastIndex, match.index);
            if (textPrefix.length > 0) {
                await page.keyboard.insertText(textPrefix);
                await page.waitForTimeout(Math.min(textPrefix.length * 5, 300));
            }
            
            const keyword = match[1];
            console.log(`[Flow Automator] Inline injection: ${keyword}`);
            
            // Trigger the @ injection for this specific keyword
            await page.keyboard.type('@');
            await page.waitForTimeout(600); 

            const searchTerm = keyword.startsWith('http') ? keyword.split('/').pop()?.split('?')[0] || keyword : keyword;
            const finalSearchTerm = searchTerm.substring(0, 50);

            const searchPop = page.getByPlaceholder(/Search|搜索/i).last();
            if (await searchPop.isVisible()) {
                await searchPop.click();
                await page.keyboard.insertText(finalSearchTerm);
            } else {
                await page.keyboard.insertText(finalSearchTerm);
            }
            
            await page.waitForTimeout(800); // 等待搜索结果列表更新完毕

            // 优先尝试精确点击匹配名称的那一项，解决模糊匹配乱序导致点错资产的问题
            try {
                await page.getByText(finalSearchTerm, { exact: true }).last().click({ timeout: 1000 });
            } catch(e) {
                // Fallback: 如果由于 DOM 结构奇特找不到精确文本，则回落到默认回车
                await page.keyboard.press('Enter');
            }
            await page.waitForTimeout(300);
            
            lastIndex = inlineTokenRegex.lastIndex;
        }

        // Type any remaining text after the last token
        const remainingText = prompt.substring(lastIndex);
        if (remainingText.length > 0) {
            await page.keyboard.insertText(remainingText);
            await page.waitForTimeout(Math.min(remainingText.length * 5, 300));
        }

        await page.waitForTimeout(1500); 

        // 3. Click the Submit Arrow Button or Press Enter
        console.log(`[Flow Automator] Submitting...`);
        
        // CRITICAL: Ensure we capture top media state
        const finalTopMedia = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img')).map(i => i.src).filter(Boolean);
            const vids = Array.from(document.querySelectorAll('video')).map(v => v.src || v.querySelector('source')?.src).filter(Boolean);
            return {
               images: imgs,
               videos: vids
            };
        });

        await page.keyboard.press('Enter');
        
        // Wait slightly for generation to start
        await page.waitForTimeout(1000);
        console.log(`[Flow Automator] Waiting for media generation (this might take a while)...`);
        
        if (fireAndForget) {
            console.log(`[Flow Automator] Fire and forget mode enabled. Asset generation triggered successfully. Returning control to human.`);
            await browser.close();
            return { success: true, url: '', fireAndForget: true, passthroughMeta };
        }

        let resultUrl = '';
        
        if (model === 'Veo 3.1') {
           const waitResult = await Promise.race([
               page.waitForFunction((prevVids: string[]) => {
                   const currentVids = Array.from(document.querySelectorAll('video')).map(v => v.src || v.querySelector('source')?.src).filter(Boolean);
                   // Return true if we find a new video src that wasn't in the previous list
                   return currentVids.some(src => !prevVids.includes(src));
               }, finalTopMedia.videos, { timeout: 300000 }).then(() => 'success' as const).catch(() => 'timeout' as const),
               ...getFailureCheckers(page, 300000)
           ]);

           if (waitResult === 'banned') throw new Error('UNUSUAL_ACTIVITY');
           if (waitResult === 'failed') throw new Error('GENERATION_FAILED');
           if (waitResult === 'timeout') throw new Error('GENERATION_TIMEOUT');
           
           resultUrl = await page.evaluate(async (prevVids: string[]) => {
               const currentVids = Array.from(document.querySelectorAll('video')).map(v => v.src || v.querySelector('source')?.src).filter(Boolean);
               const newSrc = currentVids.find(src => !prevVids.includes(src));
               if (!newSrc) return '';
               try {
                  const controller = new AbortController();
                  const res = await fetch(newSrc, { method: 'GET', signal: controller.signal });
                  const finalUrl = res.url;
                  controller.abort(); // Cancel body download immediately
                  return finalUrl;
               } catch {
                  return newSrc;
               }
           }, finalTopMedia.videos);

        } else {
           const waitResult = await Promise.race([
               page.waitForFunction((prevImgs: string[]) => {
                   const currentImgs = Array.from(document.querySelectorAll('img')).map(i => i.src).filter(Boolean);
                   return currentImgs.some(src => !prevImgs.includes(src));
               }, finalTopMedia.images, { timeout: 120000 }).then(() => 'success' as const).catch(() => 'timeout' as const),
               ...getFailureCheckers(page, 120000)
           ]);

           if (waitResult === 'banned') throw new Error('UNUSUAL_ACTIVITY');
           if (waitResult === 'failed') throw new Error('GENERATION_FAILED');
           if (waitResult === 'timeout') throw new Error('GENERATION_TIMEOUT');
           
           resultUrl = await page.evaluate(async (prevImgs: string[]) => {
               const currentImgs = Array.from(document.querySelectorAll('img')).map(i => i.src).filter(Boolean);
               const newSrc = currentImgs.find(src => !prevImgs.includes(src));
               if (!newSrc) return '';
               try {
                  const controller = new AbortController();
                  const res = await fetch(newSrc, { method: 'GET', signal: controller.signal });
                  const finalUrl = res.url;
                  controller.abort(); // Cancel body download immediately
                  return finalUrl;
               } catch {
                  return newSrc;
               }
           }, finalTopMedia.images);
        }
        
        console.log(`[Flow Automator] Success! Media URL: ${resultUrl}`);
        finalResultUrl = resultUrl;
        break; // 成功则跳出重试循环

      } catch (e: any) {
         if (e.message.includes('UNUSUAL_ACTIVITY') || e.message.includes('GENERATION_FAILED')) {
            console.warn(`[Flow Automator] 🚨 Google Rate-limit or Generation Failure hit. Instant reload requested by Director.`);
            if (attempt < MAX_RETRIES) {
                continue; // 核心自愈：无需干等，瞬间回到顶层刷新网页并重试！
            }
         }

         console.warn(`[Flow Automator] Generation pass failed on attempt ${attempt}: ${e.message}`);
         if (attempt < MAX_RETRIES) {
             continue; // 回到循环开头，触发刷新重试
         }
         throw e; // 如果是其他常规报错（或者全部重试耗尽），直接抛出错误停止执行
      }
    } // -- end of retry loop --

    await browser.close(); 
    
    return { success: true, url: finalResultUrl, passthroughMeta };
    
  } catch (error: any) {
    console.error(`[Flow Automator] Error: ${error.message}`);
    return { success: false, url: '', error: error.message, passthroughMeta };
  }
}

/**
 * 上传资产到 Flow 对话框
 */
export async function uploadAssetToFlow(
  imageBase64: string,
  name: string,
  flowUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const CDP_URL = process.env.CHROME_CDP_URL;
  if (!CDP_URL) return { success: false, error: "Missing CHROME_CDP_URL in ai-gateway env." };
  if (!flowUrl) return { success: false, error: "Missing flowUrl parameter." };

  console.log(`[Flow Automator] Uploading asset ${name} to Flow...`);
  try {
    const browser = await chromium.connectOverCDP(CDP_URL);
    const defaultContext = browser.contexts()[0];
    
    let page = defaultContext.pages().find(p => p.url().includes('labs.google/fx') && p.url().includes('tools/flow'));
    
    if (!page) {
      page = await defaultContext.newPage();
      await page.goto(flowUrl, { waitUntil: 'domcontentloaded' });
    } else {
      const currentProjectId = page.url().split('/project/')[1]?.split('?')[0];
      const targetProjectId = flowUrl.split('/project/')[1]?.split('?')[0];
      if (currentProjectId && targetProjectId && currentProjectId !== targetProjectId) {
         await page.goto(flowUrl, { waitUntil: 'domcontentloaded' });
      }
    }
    
    // Focus Editor
    const editor = page.locator('div[contenteditable="true"], textarea[placeholder*="Type a prompt"], textarea[aria-label*="prompt"]').first();
    await editor.waitFor({ state: 'visible', timeout: 30000 });
    
    // Press Escape to close dropdowns
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    await editor.click({ force: true });
    
    // Clear existing text
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(100);

    console.log(`[Flow Automator] Pasting image to editor...`);
    // Dispatch paste event with the image
    await editor.evaluate(async (el, base64) => {
        const res = await fetch(base64);
        const blob = await res.blob();
        const file = new File([blob], "asset.png", { type: blob.type });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        const event = new ClipboardEvent("paste", {
            clipboardData: dataTransfer,
            bubbles: true,
            cancelable: true,
        });
        el.dispatchEvent(event);
    }, imageBase64);

    await page.waitForTimeout(1500); // 等待图片粘贴和附件UI出现

    console.log(`[Flow Automator] Naming asset: ${name}`);
    await page.keyboard.insertText(name);
    await page.waitForTimeout(500);

    // Send it
    console.log(`[Flow Automator] Sending asset...`);
    await page.keyboard.press('Enter');
    
    // 不等待生成结果，直接返回成功，实现 fire and forget
    return { success: true };
  } catch (err: any) {
    console.error('[Flow Automator] Upload Error:', err.message);
    return { success: false, error: err.message };
  }
}

