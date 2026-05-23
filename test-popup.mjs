import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = __dirname;

async function testPopup() {
    const browser = await chromium.launchPersistentContext('', {
        headless: false,
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--no-sandbox',
        ],
        executablePath: 'C:\\Users\\Kirill\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe',
    });

    await new Promise(r => setTimeout(r, 2000));

    const workers = browser.serviceWorkers();
    console.log('Service workers:', workers.map(w => w.url()));

    let extensionId = null;
    for (const worker of workers) {
        const match = worker.url().match(/chrome-extension:\/\/([^\/]+)/);
        if (match) {
            extensionId = match[1];
            break;
        }
    }

    if (!extensionId) {
        const pages = browser.pages();
        for (const page of pages) {
            const match = page.url().match(/chrome-extension:\/\/([^\/]+)/);
            if (match) { 
                extensionId = match[1]; 
                break; 
            }
        }
    }

    console.log('Extension ID:', extensionId);

    if (!extensionId) {
        console.error('Could not find extension ID');
        await browser.close();
        return;
    }

    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await new Promise(r => setTimeout(r, 1000));

    const dims = await page.evaluate(() => ({
        bodyHeight: document.body.scrollHeight,
        bodyWidth: document.body.scrollWidth,
        bodyOffsetHeight: document.body.offsetHeight,
        htmlHeight: document.documentElement.scrollHeight,
        containerHeight: document.querySelector('.container')?.scrollHeight,
        errors: window._errors || [],
    }));

    console.log('Popup dimensions:', dims);

    page.on('console', msg => {
        if (msg.type() === 'error') 
            console.log('PAGE ERROR:', msg.text());
    });
    page.on('pageerror', err => console.log('PAGE EXCEPTION:', err.message));

    await page.screenshot({ path: 'popup-test.png', fullPage: true });
    console.log('Screenshot saved to popup-test.png');

    await new Promise(r => setTimeout(r, 3000));
    await browser.close();
}

testPopup().catch(console.error);
