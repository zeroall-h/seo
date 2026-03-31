import axios from 'axios';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

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

async function fetchWithBrowser(url) {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(BROWSER_UA);

    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    const status = response.status();
    const html = await page.content();
    const headers = response.headers();

    return { status, html, headers, usedPuppeteer: true };
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
      return await fetchWithBrowser(url);
    }

    return { status, html, headers, usedPuppeteer: false };
  } catch {
    return await fetchWithBrowser(url);
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
      const result = await fetchWithBrowser(url);
      return { status: result.status, headers: result.headers, usedPuppeteer: true };
    }

    return { status, headers, usedPuppeteer: false };
  } catch {
    const result = await fetchWithBrowser(url);
    return { status: result.status, headers: result.headers, usedPuppeteer: true };
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
      const result = await fetchWithBrowser(robotsUrl);
      return { status: result.status, body: result.html, headers: result.headers, usedPuppeteer: true };
    }

    return { status, body, headers, usedPuppeteer: false };
  } catch {
    try {
      const result = await fetchWithBrowser(robotsUrl);
      return { status: result.status, body: result.html, headers: result.headers, usedPuppeteer: true };
    } catch {
      return { status: null, body: '', headers: {}, usedPuppeteer: false };
    }
  }
}
