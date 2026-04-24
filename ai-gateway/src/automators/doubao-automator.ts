import { chromium } from 'playwright-core';

// 全局并发锁，防止多个请求同时控制同一个网页导致互相删除对话
let isDoubaoGenerating = false;

export async function generatePromptWithDoubaoWeb(systemPrompt: string, userPrompt: string, forceJson: boolean = true): Promise<string> {
    // 简单的自旋锁，如果当前有生成任务，等待它完成而不是直接抛出错误
    const maxWaitTime = 120000; // 等待最多 2 分钟
    const startTime = Date.now();
    while (isDoubaoGenerating) {
        if (Date.now() - startTime > maxWaitTime) {
            throw new Error("Doubao automator is busy and timed out waiting for the lock.");
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    isDoubaoGenerating = true;
    
    const CDP_URL = process.env.CHROME_CDP_URL || 'http://127.0.0.1:9222';
    console.log(`[Doubao Automator] Connecting to Chrome CDP at ${CDP_URL}...`);
    
    let browser;
    try {
        browser = await chromium.connectOverCDP(CDP_URL);
    } catch (e: any) {
        throw new Error(`[Doubao Automator] Failed to connect to CDP. Make sure Chrome is running with --remote-debugging-port=9222.\n${e.message}`);
    }

    let targetPage = null;
    for (const context of browser.contexts()) {
        for (const page of context.pages()) {
            if (page.url().includes('doubao.com/chat')) {
                targetPage = page;
                break;
            }
        }
        if (targetPage) break;
    }

    if (!targetPage) {
        await browser.close();
        throw new Error("找不到运行中的豆包网页 (doubao.com/chat)。请先在 Chrome 中打开它。");
    }

    try {
        console.log(`[Doubao Automator] 尝试点击“新对话”按钮以清空上下文...`);
        const newChatBtn = targetPage.getByText('新对话', { exact: true }).first();
        const newChatAria = targetPage.locator('[aria-label*="新对话"]').first();
        const newChatEdit = targetPage.locator('svg[data-type="edit"]').first();

        if (await newChatBtn.isVisible()) {
            await newChatBtn.click();
        } else if (await newChatAria.isVisible()) {
            await newChatAria.click();
        } else if (await newChatEdit.isVisible()) {
            await newChatEdit.click();
        } else {
            // 兜底方案
            await targetPage.keyboard.press('Meta+k');
        }
        await targetPage.waitForTimeout(1000);

        console.log(`[Doubao Automator] 尝试切换专家模式...`);
        try {
            const fastBtn = targetPage.getByText('快速', { exact: true }).last();
            if (await fastBtn.isVisible({ timeout: 2000 })) {
                await fastBtn.click();
                await targetPage.waitForTimeout(500);
                
                const expertBtn = targetPage.getByText('专家', { exact: false }).last();
                if (await expertBtn.isVisible({ timeout: 2000 })) {
                    await expertBtn.click();
                    console.log(`[Doubao Automator] 成功切换为专家模式！`);
                }
            }
        } catch (e: any) {
            console.log(`[Doubao Automator] 切换专家模式跳过: ${e.message}`);
        }

        console.log(`[Doubao Automator] 寻找输入框...`);
        let inputFound = false;
        const textareas = await targetPage.locator('textarea').all();
        for (const ta of textareas) {
            if (await ta.isVisible()) {
                await ta.click({ force: true });
                inputFound = true;
                break;
            }
        }

        if (!inputFound) {
            const editable = targetPage.locator('[contenteditable="true"]').last();
            if (await editable.isVisible()) {
                await editable.click({ force: true });
                inputFound = true;
            }
        }

        if (!inputFound) {
            // Fallback to user's selector
            await targetPage.locator('#input-engine-container textarea').first().click({ force: true });
        }
        
        let fullPrompt = `${systemPrompt}\n\n======================\n\n${userPrompt}`;
        if (forceJson) {
            fullPrompt += `\n\n(REMEMBER: Output strict JSON only)`;
        }
        
        console.log(`[Doubao Automator] 正在输入 Prompt...`);
        await targetPage.keyboard.insertText(fullPrompt);
        await targetPage.waitForTimeout(500);

        // 核心修复：发送前记录主聊天区现有的 AI 气泡头像数量
        const botIconSelector = 'main svg[data-type="main-bot"], #chat-route-main svg[data-type="main-bot"]';
        const prevBotCount = await targetPage.locator(botIconSelector).count();

        console.log(`[Doubao Automator] 点击发送 (Enter)...`);
        await targetPage.keyboard.press('Enter');
        
        console.log(`[Doubao Automator] 等待 AI 回复气泡出现...`);
        let aiBubbleAppeared = false;
        // 等待最多 30 秒让 AI 开始回复
        for (let i = 0; i < 60; i++) {
            await targetPage.waitForTimeout(500);
            const currentBotCount = await targetPage.locator(botIconSelector).count();
            if (currentBotCount > prevBotCount) {
                aiBubbleAppeared = true;
                console.log(`[Doubao Automator] 检测到新的 AI 回复气泡！开始监控文本生成状态...`);
                break;
            }
        }

        if (!aiBubbleAppeared) {
             console.log(`[Doubao Automator] 警告: 未能严格检测到新的 AI 头像图标，将退回到直接读取文本。`);
        }

        let previousLength = 0;
        let unchangedCount = 0;
        let finalText = "";
        
        for (let i = 0; i < 90; i++) {
            await targetPage.waitForTimeout(1000);
            
            const allTextElements = await targetPage.locator('.paragraph-element, [data-testid="chat-message-text"]').all();
            
            if (allTextElements.length > 0) {
                const latestMsg = allTextElements[allTextElements.length - 1];
                const text = await latestMsg.innerText().catch(() => "");
                
                const isDoneIndicator = forceJson ? text.includes('}') : true;

                if (text.length > 5 && text.length === previousLength && isDoneIndicator) {
                    unchangedCount++;
                    if (unchangedCount >= 3) {
                         // 等待复制按钮出现，确保 UI 完全结算完毕
                         const copyBtn = targetPage.locator('svg[data-dbx-name="button-copy"], [data-testid="chat-message-action-copy"], .message-action-button-main').last();
                         if (await copyBtn.isVisible({ timeout: 5000 }).catch(()=>false)) {
                             console.log(`[Doubao Automator] 动作按钮已出现，文本彻底稳定！`);
                         } else {
                             console.log(`[Doubao Automator] 文本已稳定不再增加！(未检测到复制按钮)`);
                         }
                         finalText = text;
                         break;
                    }
                } else if (text.length > 0) {
                    unchangedCount = 0;
                    previousLength = text.length;
                }
            }
        }

        // ==========================
        // 阅后即焚：异步后台删除，立即返回数据给用户
        // ==========================
        setTimeout(async () => {
            console.log(`[Doubao Automator] 后台异步执行会话清理... (等待 8 秒让后台完成落盘)`);
            try {
                // 等待 8 秒，这是解决“删除失败”弹窗的核心！
                // 因为此时即使文本已返回，豆包后台仍在生成对话标题，立刻删除必定被后端拦截并报错。
                // 这个等待是在后台执行的，完全不影响前台响应速度。
                await targetPage.waitForTimeout(8000);

                const conversations = targetPage.locator('[id^="conversation_"]');
                if (await conversations.count() > 0) {
                    const firstConv = conversations.first();
                    const box = await firstConv.boundingBox();
                    
                    if (box) {
                        let deleted = false;
                        for (let attempt = 0; attempt < 3; attempt++) {
                            await firstConv.scrollIntoViewIfNeeded();
                            await firstConv.hover();
                            await targetPage.waitForTimeout(500);
                            
                            const menuBtn = firstConv.locator('button[aria-haspopup="menu"], button[data-dbx-name="button"]').last();
                            if (await menuBtn.isVisible()) {
                                await menuBtn.click({ force: true });
                            } else {
                                const freshBox = await firstConv.boundingBox();
                                if (freshBox) {
                                    await targetPage.mouse.click(freshBox.x + freshBox.width - 20, freshBox.y + freshBox.height / 2);
                                }
                            }
                            
                            await targetPage.waitForTimeout(800);
                            
                            const deleteMenu = targetPage.getByText('删除', { exact: true }).last();
                            if (await deleteMenu.isVisible()) {
                                await deleteMenu.click();
                                await targetPage.waitForTimeout(1000);
                                
                                const allDeleteBtns = await targetPage.getByRole('button', { name: '删除' }).or(targetPage.getByText('删除', { exact: true })).all();
                                let confirmClicked = false;
                                for (const btn of allDeleteBtns) {
                                    const className = await btn.getAttribute('class') || '';
                                    if (className.includes('bg-dbx-function-danger')) {
                                        await btn.click({ force: true });
                                        confirmClicked = true;
                                        break;
                                    }
                                }

                                if (!confirmClicked && allDeleteBtns.length > 0) {
                                    await allDeleteBtns[allDeleteBtns.length - 1].click({ force: true });
                                }
                                
                                console.log(`[Doubao Automator] 后台清理完成：会话已成功删除。`);
                                deleted = true;
                                break;
                            }
                        }
                        if (!deleted) {
                            console.log(`[Doubao Automator] 重试 3 次均未能呼出“删除”菜单。`);
                        }
                    }
                }
            } catch (delError: any) {
                console.log(`[Doubao Automator] 警告：后台清理会话失败 (${delError.message})`);
            } finally {
                isDoubaoGenerating = false;
                await browser.close();
            }
        }, 0);

        // 立即返回数据，不等待删除操作
        return finalText;

    } catch (e: any) {
        isDoubaoGenerating = false;
        if (browser) await browser.close();
        console.error(`[Doubao Automator Error] ${e.message}`);
        throw e;
    }
}
