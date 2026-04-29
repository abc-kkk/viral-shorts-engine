const puppeteer = require('puppeteer-core');
(async () => {
    try {
        const browser = await puppeteer.connect({
            browserWSEndpoint: 'ws://127.0.0.1:9222/devtools/page/8C4DF430DAFF7D1240615C732B38CF28',
            defaultViewport: null,
        });
        const pages = await browser.pages();
        for (const p of pages) {
            console.log("Page URL:", p.url());
        }
        await browser.disconnect();
    } catch (e) {
        console.error(e);
    }
})();
