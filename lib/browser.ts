import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export async function fetchWithBrowser(url: string) {
  const executablePath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(BROWSER_UA);

    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 25000,
    });

    const status = response?.status() ?? 0;
    const html = await page.content();
    const headers = response?.headers() ?? {};

    return { status, html, headers, usedBrowser: true };
  } finally {
    await browser.close();
  }
}
