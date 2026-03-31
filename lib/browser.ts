import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser } from 'playwright';

chromium.use(StealthPlugin());

let browserInstance: Browser | null = null;
let launching: Promise<Browser> | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browserInstance?.isConnected()) return browserInstance;
  if (launching) return launching;

  launching = chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  browserInstance = await launching;
  launching = null;

  browserInstance.on('disconnected', () => {
    browserInstance = null;
  });

  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
