const puppeteer = require('puppeteer-core');
(async () => {
    try {
        const res = await fetch(`http://127.0.0.1:9222/json/version`);
        const data = await res.json();
        const browser = await puppeteer.connect({
            browserWSEndpoint: data.webSocketDebuggerUrl,
            defaultViewport: null,
        });
        const pages = await browser.pages();
        for (const p of pages) {
            if (p.url().includes('tools/flow')) {
                const href = await p.evaluate(() => window.location.href);
                console.log("DOM window.location.href:", href);
            }
        }
        await browser.disconnect();
    } catch (e) {
        console.error(e);
    }
})();
