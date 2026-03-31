import axios from 'axios';
import { getBrowser } from './browser';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const TIMEOUT = 15000;

function isCloudflareChallenge(
  status: number,
  body: string,
  headers: Record<string, string> = {},
): boolean {
  if (status === 403) {
    const cfMitigated = (headers['cf-mitigated'] || '').toString();
    const server = (headers['server'] || '').toString();
    if (cfMitigated.includes('challenge') || server.toLowerCase() === 'cloudflare') return true;
    if (typeof body === 'string' && body.includes('cdn-cgi/challenge-platform')) return true;
  }
  return false;
}

function needsBrowserRendering(html: string): boolean {
  if (!html || html.trim().length < 200) return true;
  const hasTitle = /<title[^>]*>.+<\/title>/is.test(html);
  const hasBody = /<body[^>]*>.{100,}/is.test(html);
  return !hasTitle && !hasBody;
}

async function fetchWithPlaywright(url: string) {
  const browser = await getBrowser();
  const context = await browser.newContext({ userAgent: BROWSER_UA });
  const page = await context.newPage();
  try {
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    const status = response?.status() ?? 0;
    const html = await page.content();
    const headers = response?.headers() ?? {};
    return { status, html, headers, usedPlaywright: true };
  } finally {
    await context.close();
  }
}

export async function fetchPage(url: string) {
  try {
    const response = await axios.get(url, {
      maxRedirects: 5,
      timeout: TIMEOUT,
      validateStatus: () => true,
      headers: { 'User-Agent': BROWSER_UA },
    });

    const status = response.status;
    const html = typeof response.data === 'string' ? response.data : '';
    const headers = response.headers as Record<string, string>;

    if (isCloudflareChallenge(status, html, headers) || needsBrowserRendering(html)) {
      return await fetchWithPlaywright(url);
    }

    return { status, html, headers, usedPlaywright: false };
  } catch {
    return await fetchWithPlaywright(url);
  }
}

export async function fetchHttpStatus(url: string) {
  try {
    const response = await axios.get(url, {
      maxRedirects: 0,
      timeout: TIMEOUT,
      validateStatus: () => true,
      headers: { 'User-Agent': BROWSER_UA },
    });

    const status = response.status;
    const headers = response.headers as Record<string, string>;
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

export async function fetchRobotsTxt(url: string) {
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
    const headers = response.headers as Record<string, string>;

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
