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
                const cookies = await p.cookies();
                const stCookie = cookies.find(c => c.name === '__Secure-next-auth.session-token');
                if (stCookie) {
                    const sessionRes = await fetch(`https://labs.google/fx/api/auth/session`, {
                        headers: { 'Cookie': `__Secure-next-auth.session-token=${stCookie.value}` }
                    });
                    const sessionData = await sessionRes.json();
                    const at = sessionData.access_token;
                    
                    const recaptchaToken = await p.evaluate(async () => {
                        return await window.grecaptcha.enterprise.execute('6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV', { action: 'IMAGE_GENERATION' });
                    });
                    
                    const reqObj = {
                        clientContext: {
                            recaptchaContext: { token: recaptchaToken, applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB" },
                            sessionId: ";" + Date.now(),
                            projectId: "flow",
                            tool: "PINHOLE"
                        },
                        mediaGenerationContext: { batchId: "test-" + Date.now() },
                        useNewMedia: true,
                        requests: [{
                            seed: 12345,
                            imageModelName: "NARWHAL",
                            imageAspectRatio: "IMAGE_ASPECT_RATIO_LANDSCAPE",
                            structuredPrompt: { parts: [{ text: "a cat" }] }
                        }]
                    };
                    
                    const apiRes = await fetch('https://aisandbox-pa.googleapis.com/v1/projects/flow/flowMedia:batchGenerateImages', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${at}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(reqObj)
                    });
                    
                    console.log("API Status:", apiRes.status);
                    const apiData = await apiRes.text();
                    console.log("API Response:", apiData.substring(0, 500));
                }
            }
        }
        await browser.disconnect();
    } catch (e) {
        console.error(e);
    }
})();
