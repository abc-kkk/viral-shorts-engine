import { chromium } from 'playwright-core';
import 'dotenv/config';

async function testDoubaoDelete() {
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

    if (!targetPage) {
        console.error("[Test] 找不到 doubao.com/chat 页面。");
        await browser.close();
        return;
    }

    console.log(`[Test] 成功找到豆包页面: ${targetPage.url()}`);

    try {
        // 测试删除当前高亮的会话
        console.log(`[Test] 尝试删除当前会话...`);
        // 豆包左侧栏，当前选中的会话通常有一个激活的状态。或者我们可以找所有含有 "操作" 或 "..." 的按钮
        // 用户图片显示：三个点 -> 弹出框 -> 包含"删除"
        // 我们尝试右键点击侧边栏第一个会话，或者寻找它的下拉菜单
        
        // 1. 尝试寻找侧边栏的对话列表
        const conversations = targetPage.locator('[id^="conversation_"]');
        if (await conversations.count() > 0) {
            const firstConv = conversations.first();
            console.log(`[Test] 找到历史对话列表。悬浮第一个...`);
            await firstConv.hover();
            await targetPage.waitForTimeout(500);
            
            // 悬浮后应该会出现 "..." 或某种菜单按钮。如果找不到，我们试试右键
            console.log(`[Test] 右键点击对话...`);
            await firstConv.click({ button: 'right' });
            await targetPage.waitForTimeout(500);
            
            // 寻找"删除"按钮
            const deleteBtn = targetPage.getByText('删除', { exact: true }).last();
            if (await deleteBtn.isVisible()) {
                console.log(`[Test] 找到删除按钮，正在点击...`);
                await deleteBtn.click();
                await targetPage.waitForTimeout(500);
                
                // 可能会有确认弹窗
                const confirmBtn = targetPage.getByRole('button', { name: '确定' }).or(targetPage.getByText('确定', { exact: true })).last();
                if (await confirmBtn.isVisible({ timeout: 2000 }).catch(()=>false)) {
                     console.log(`[Test] 出现确认删除弹窗，点击确定...`);
                     await confirmBtn.click();
                } else {
                     console.log(`[Test] 未出现或未检测到确认弹窗。`);
                }
                console.log(`[Test] 删除操作完成。`);
            } else {
                console.log(`[Test] 右键没有触发包含"删除"的菜单。尝试寻找内联的 "..." 按钮`);
                // 有时候豆包是在悬浮后显示一个 svg 或 button
                const moreBtn = firstConv.locator('button, svg').last();
                await moreBtn.click({ force: true });
                await targetPage.waitForTimeout(500);
                
                if (await deleteBtn.isVisible()) {
                    console.log(`[Test] 找到删除按钮，正在点击...`);
                    await deleteBtn.click();
                    await targetPage.waitForTimeout(500);
                    const confirmBtn = targetPage.getByRole('button', { name: '确定' }).or(targetPage.getByText('确定', { exact: true })).last();
                    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(()=>false)) {
                         await confirmBtn.click();
                    }
                    console.log(`[Test] 删除操作完成。`);
                } else {
                    console.log(`[Test] 依然找不到删除按钮。`);
                }
            }
        } else {
            console.log(`[Test] 找不到带有 id="conversation_..." 的元素。`);
        }

    } catch (err: any) {
        console.error(`[Test] 发生严重错误:`, err);
    } finally {
        await browser.close();
    }
}

testDoubaoDelete();
