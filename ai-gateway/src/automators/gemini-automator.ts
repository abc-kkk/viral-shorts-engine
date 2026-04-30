import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

/**
 * Automates the active gemini.google.com tab to generate prompts.
 * Uses Playwright CDP to inject instructions, send them, and wait for the response to finish.
 */
async function launchChromeWithDebugPort() {
    const tempUserDataDir = path.join(os.tmpdir(), 'chrome-debug');
    
    // Try common Chrome paths
    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ];

    let chromePath = chromePaths.find(p => {
        try {
            return require('fs').existsSync(p);
        } catch {
            return false;
        }
    });

    if (!chromePath) {
        throw new Error('未找到 Chrome 浏览器，请手动启动：chrome --remote-debugging-port=9222');
    }

    console.log(`[Gemini Automator] 正在启动 Chrome: ${chromePath}`);
    
    const chromeProcess = spawn(chromePath, [
        '--remote-debugging-port=9222',
        `--user-data-dir=${tempUserDataDir}`,
        '--no-first-run',
        '--no-default-browser-check'
    ], {
        detached: true,
        stdio: 'ignore'
    });

    chromeProcess.unref();
    
    // Wait for Chrome to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log(`[Gemini Automator] Chrome 已启动`);
}

export async function generatePromptWithGeminiWeb(systemPrompt: string, userPrompt: string, forceJson: boolean = true): Promise<string> {
    const CDP_URL = process.env.CHROME_CDP_URL || 'http://127.0.0.1:9222';
    console.log(`[Gemini Automator] Connecting to Chrome CDP at ${CDP_URL}...`);
    
    let browser;
    let retries = 0;
    const maxRetries = 2;
    
    while (retries <= maxRetries) {
        try {
            browser = await chromium.connectOverCDP(CDP_URL);
            break;
        } catch (e: any) {
            retries++;
            if (retries > maxRetries) {
                throw new Error(`[Gemini Automator] Failed to connect to CDP. Make sure Chrome is running with --remote-debugging-port=9222.\n${e.message}`);
            }
            console.log(`[Gemini Automator] 连接失败，尝试自动启动 Chrome (${retries}/${maxRetries})...`);
            await launchChromeWithDebugPort();
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    if (!browser) {
        throw new Error('Browser failed to initialize');
    }

    let targetPage = null;
    for (const context of browser.contexts()) {
        for (const page of context.pages()) {
            if (page.url().includes('gemini.google.com')) {
                targetPage = page;
                break;
            }
        }
        if (targetPage) break;
    }

    if (!targetPage) {
        console.log(`[Gemini Automator] 未找到 Gemini 页面，正在自动打开...`);
        // Try to get a context or create a new one
        let context;
        if (browser.contexts().length > 0) {
            context = browser.contexts()[0];
        } else {
            context = await browser.newContext();
        }
        targetPage = await context.newPage();
        await targetPage.goto('https://gemini.google.com', { waitUntil: 'networkidle' });
        console.log(`[Gemini Automator] Gemini 页面已打开，请在浏览器中登录你的 Google 账号！`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    try {
        // 取消 bringToFront()，不再夺走焦点，让 AI 能够真正的静默打黑工
        // ==========================================
        // 上下文清理阶段：每次回答前强行开新局，防止前文角色污染！
        // ==========================================
        console.log(`[Gemini Automator] Clearing context to prevent AI memory contamination...`);
        try {
            // Step 1: 点击侧边栏 New Chat 按钮（用精确选择器 + force 绕过 disabled 状态）
            console.log(`[Gemini Automator] Step 1: Clicking New Chat button in sidebar...`);
            const newChatBtn = targetPage.locator('side-navigation-content side-nav-action-button > a').first();
            await newChatBtn.waitFor({ state: 'attached', timeout: 5000 });
            await newChatBtn.click({ force: true }); // force 绕过 disabled
            console.log(`[Gemini Automator] New Chat clicked! Waiting for page to settle...`);
            await targetPage.waitForTimeout(300);

            // Step 2: 点击右上方 Temporary Chat（临时对话）按钮
            console.log(`[Gemini Automator] Step 2: Clicking Temporary Chat button...`);
            const tempChatBtn = targetPage.locator('temp-chat-button > button').first();
            await tempChatBtn.waitFor({ state: 'visible', timeout: 8000 });
            await tempChatBtn.click({ force: true });
            console.log(`[Gemini Automator] Temporary Chat activated!`);
            await targetPage.waitForTimeout(300);
        } catch (e: any) {
            // 如果按钮流程失败，尝试直接导航到 /app 作为 fallback
            console.log(`[Gemini Automator] Button click failed (${e.message}), trying direct navigation fallback...`);
            try {
                await targetPage.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded', timeout: 15000 });
                await targetPage.waitForTimeout(300);
                // 再次尝试点击临时聊天按钮
                const tempChatBtnRetry = targetPage.locator('temp-chat-button > button').first();
                if (await tempChatBtnRetry.isVisible({ timeout: 5000 }).catch(() => false)) {
                    await tempChatBtnRetry.click({ force: true });
                    await targetPage.waitForTimeout(300);
                    console.log(`[Gemini Automator] Temporary Chat activated via fallback!`);
                }
            } catch (navError: any) {
                console.log(`[Gemini Automator] Fallback navigation also failed (ignored): ${navError.message}`);
            }
        }
        // ==========================================

        console.log(`[Gemini Automator] Searching for the chat text input area...`);
        const inputArea = targetPage.locator('rich-textarea [contenteditable="true"], .ql-editor[contenteditable="true"]').first();
        await inputArea.waitFor({ state: 'visible', timeout: 5000 });
        await inputArea.click();
        
        // Combine system and user prompt
        let fullPrompt = `${systemPrompt}\n\n======================\n\n${userPrompt}`;
        if (forceJson) {
            fullPrompt += `\n\n(REMEMBER: Output strict JSON only)`;
        }
        
        await targetPage.keyboard.insertText(fullPrompt);
        await targetPage.waitForTimeout(500);

        // 用 Enter 键发送，不依赖任何按钮选择器，彻底免疫 UI 语言/改版变化
        const prevMessageCount = await targetPage.locator('message-content').count();

        console.log(`[Gemini Automator] Pressing Enter to send message...`);
        await targetPage.keyboard.press('Enter');
        
        console.log(`[Gemini Automator] Waiting for new message to appear...`);
        let newCount = prevMessageCount;
        let waitAttempts = 0;
        // 等待新的回复气泡出现（如果使用超慢模型如 3.1 Pro，可能要等好久才蹦出第一个字）
        while (newCount === prevMessageCount && waitAttempts < 90) {
             await targetPage.waitForTimeout(1000);
             newCount = await targetPage.locator('message-content').count();
             waitAttempts++;
        }

        if (newCount === prevMessageCount) {
             throw new Error("Gemini has not responded within 90 seconds. It might be stuck or processing a very heavy request.");
        }

        console.log(`[Gemini Automator] Message appeared! Waiting for text stream to settle...`);
        const newMessage = targetPage.locator('message-content').last();
        let previousLength = 0;
        let unchangedCount = 0;
        
        // Polling loop until the text stops changing for 3 consecutive seconds (signaling completion)
        // With 'Thinking' mode, it can take up to ~30-40 seconds to finish.
        for (let i = 0; i < 90; i++) { // Max 90 seconds wait
            await targetPage.waitForTimeout(1000);
            const text = await newMessage.innerText().catch(() => "");
            
            const isDoneIndicator = forceJson ? text.includes('}') : true;
            if (text.length > 5 && text.length === previousLength && isDoneIndicator) {
                unchangedCount++;
                if (unchangedCount >= 3) {
                    console.log(`[Gemini Automator] Text stream stabilized. Generation complete!`);
                    break; 
                }
            } else {
                unchangedCount = 0;
                previousLength = text.length;
            }
        }

        const finalResponseText = await newMessage.innerText();
        return finalResponseText;

    } catch (e: any) {
        console.error(`[Gemini Automator Error] ${e.message}`);
        throw e;
    } finally {
        if (browser) await browser.close();
    }
}
