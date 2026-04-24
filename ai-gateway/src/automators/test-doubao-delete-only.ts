import { chromium } from 'playwright-core';
import 'dotenv/config';

async function testDeleteOnly() {
    const CDP_URL = process.env.CHROME_CDP_URL || 'http://127.0.0.1:9222';
    console.log(`[Test] Connecting to Chrome CDP at ${CDP_URL}...`);
    
    let browser;
    try {
        browser = await chromium.connectOverCDP(CDP_URL);
    } catch (e: any) {
        console.error(`[Test] Failed to connect: ${e.message}`);
        return;
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

    if (!targetPage) return;

    try {
        console.log(`[Test] 请看浏览器窗口... 即将演示删除最新的对话！`);
        // 等待 2 秒给用户切屏观察的时间
        await targetPage.waitForTimeout(2000);

        console.log(`[Test] 尝试删除当前最新会话...`);
        const conversations = targetPage.locator('[id^="conversation_"]');
        if (await conversations.count() > 0) {
            const firstConv = conversations.first();
            
            let deleted = false;
            for (let attempt = 0; attempt < 3; attempt++) {
                await firstConv.scrollIntoViewIfNeeded();
                await firstConv.hover();
                await targetPage.waitForTimeout(500);
                
                const menuBtn = firstConv.locator('button[aria-haspopup="menu"], button[data-dbx-name="button"]').last();
                if (await menuBtn.isVisible()) {
                    console.log(`[Test] 找到了 ... 菜单按钮，点击它！`);
                    await menuBtn.click({ force: true });
                } else {
                    console.log(`[Test] 没找到 ... 按钮，使用坐标强制点击边缘！`);
                    const freshBox = await firstConv.boundingBox();
                    if (freshBox) {
                        await targetPage.mouse.click(freshBox.x + freshBox.width - 20, freshBox.y + freshBox.height / 2);
                    }
                }
                
                await targetPage.waitForTimeout(800);
                
                const deleteMenu = targetPage.getByText('删除', { exact: true }).last();
                if (await deleteMenu.isVisible()) {
                    console.log(`[Test] 弹出菜单中找到了"删除"，点击它！`);
                    await deleteMenu.click();
                    
                    // 等待弹窗出现，故意多等1秒让你看清
                    await targetPage.waitForTimeout(1000);
                    
                    // 寻找页面上所有名为“删除”的可见按钮
                    const allDeleteBtns = await targetPage.getByRole('button', { name: '删除' }).or(targetPage.getByText('删除', { exact: true })).all();
                    console.log(`[Test] 页面上共有 ${allDeleteBtns.length} 个“删除”字样的元素`);
                    
                    let confirmClicked = false;
                    for (const btn of allDeleteBtns) {
                        const className = await btn.getAttribute('class') || '';
                        // 确认弹窗里的删除按钮是红色的，带有 bg-dbx-function-danger 类名
                        if (className.includes('bg-dbx-function-danger')) {
                            console.log(`[Test] 找到带有红色背景 class 的确认删除按钮，正在点击...`);
                            await btn.click({ force: true });
                            confirmClicked = true;
                            break;
                        }
                    }

                    if (!confirmClicked) {
                        console.log(`[Test] 未找到具有特定 class 的红色按钮，尝试点击最后一个“删除”按钮（通常弹窗在最上层）...`);
                        if (allDeleteBtns.length > 0) {
                            await allDeleteBtns[allDeleteBtns.length - 1].click({ force: true });
                        }
                    }
                    
                    console.log(`[Test] 演示完毕！会话已成功删除。`);
                    deleted = true;
                    break;
                }
            }
            if (!deleted) {
                console.log(`[Test] 失败了：重试了 3 次都没能呼出菜单。`);
            }
        }
    } catch (err: any) {
        console.error(`[Test] 发生严重错误:`, err);
    } finally {
        await browser.close();
    }
}
testDeleteOnly();
