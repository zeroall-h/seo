import axios from 'axios';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const TIMEOUT = 15000;

function isCloudflareChallenge(status, body, headers = {}) {
  if (status === 403) {
    const cfMitigated = (headers['cf-mitigated'] || '').toString();
    const server = (headers['server'] || '').toString();
    if (cfMitigated.includes('challenge') || server.toLowerCase() === 'cloudflare') return true;
    if (typeof body === 'string' && body.includes('cdn-cgi/challenge-platform')) return true;
  }
  return false;
}

async function fetchWithPlaywright(url) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const context = await browser.newContext({ userAgent: BROWSER_UA });
    const page = await context.newPage();

    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const status = response?.status() ?? 0;
    const html = await page.content();
    const headers = response?.headers() ?? {};

    return { status, html, headers, usedPlaywright: true };
  } finally {
    await browser.close();
  }
}

export async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      maxRedirects: 5,
      timeout: TIMEOUT,
      validateStatus: () => true,
      headers: { 'User-Agent': BROWSER_UA },
    });

    const status = response.status;
    const html = typeof response.data === 'string' ? response.data : '';
    const headers = response.headers;

    if (isCloudflareChallenge(status, html, headers)) {
      return await fetchWithPlaywright(url);
    }

    return { status, html, headers, usedPlaywright: false };
  } catch {
    return await fetchWithPlaywright(url);
  }
}

export async function fetchHttpStatus(url) {
  try {
    const response = await axios.get(url, {
      maxRedirects: 0,
      timeout: TIMEOUT,
      validateStatus: () => true,
      headers: { 'User-Agent': BROWSER_UA },
    });

    const status = response.status;
    const headers = response.headers;
    const body = typeof response.data === 'string' ? response.data : '';

    if (isCloudflareChallenge(status, body, headers)) {
      const result = await fetchWithPlaywright(url);
      return { status: result.status, headers: result.headers, usedPlaywright: true };
    }

    return { status, headers, usedPlaywright: false };
  } catch {
    const result = await fetchWithPlaywright(url);
    return { status: result.status, headers: result.headers, usedPlaywright: true };
  }
}

export async function fetchRobotsTxt(url) {
  const { origin } = new URL(url);
  const robotsUrl = `${origin}/robots.txt`;

  try {
    const response = await axios.get(robotsUrl, {
      maxRedirects: 5,
      timeout: TIMEOUT,
      validateStatus: () => true,
      responseType: 'text',
      headers: { 'User-Agent': BROWSER_UA },
    });

    const status = response.status;
    const body = typeof response.data === 'string' ? response.data : '';
    const headers = response.headers;

    if (isCloudflareChallenge(status, body, headers)) {
      const result = await fetchWithPlaywright(robotsUrl);
      return { status: result.status, body: result.html, headers: result.headers, usedPlaywright: true };
    }

    return { status, body, headers, usedPlaywright: false };
  } catch {
    try {
      const result = await fetchWithPlaywright(robotsUrl);
      return { status: result.status, body: result.html, headers: result.headers, usedPlaywright: true };
    } catch {
      return { status: null, body: '', headers: {}, usedPlaywright: false };
    }
  }
}
