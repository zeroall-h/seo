import axios from 'axios';
import { fetchWithBrowser } from './browser';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const TIMEOUT = 15000;
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '2de799f8c1143e968e2f0ca2b9929745';

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

async function fetchWithScraperAPI(url: string) {
  const apiUrl = `https://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=true`;
  const response = await axios.get(apiUrl, {
    timeout: 60000,
    validateStatus: () => true,
  });

  const status = response.status;
  const html = typeof response.data === 'string' ? response.data : '';
  const headers = response.headers as Record<string, string>;

  return { status, html, headers, usedScraperAPI: true };
}

export async function fetchPage(url: string) {
  // 1차: axios 직접 요청
  let axiosResult = null;
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
    axiosResult = { status, html, headers, usedScraperAPI: false };

    if (!isCloudflareChallenge(status, html, headers) && !needsBrowserRendering(html)) {
      return axiosResult;
    }
  } catch {
    // axios failed
  }

  // 2차: ScraperAPI (봇 방어 우회 + 렌더링)
  try {
    const scraperResult = await fetchWithScraperAPI(url);
    if (scraperResult.html && scraperResult.html.trim().length > 200) {
      return scraperResult;
    }
  } catch {
    // ScraperAPI failed
  }

  // 3차: 브라우저 폴백
  try {
    const browserResult = await fetchWithBrowser(url);
    if (browserResult) return browserResult;
  } catch {
    // browser fallback failed
  }

  return axiosResult || { status: null, html: '', headers: {}, usedScraperAPI: false };
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
      try {
        const result = await fetchWithScraperAPI(url);
        if (result) return { status: result.status, headers: result.headers, usedScraperAPI: true };
      } catch { /* fallback failed */ }
    }

    return { status, headers, usedScraperAPI: false };
  } catch {
    try {
      const result = await fetchWithScraperAPI(url);
      if (result) return { status: result.status, headers: result.headers, usedScraperAPI: true };
    } catch { /* fallback failed */ }
    return { status: null, headers: {}, usedScraperAPI: false };
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
      try {
        const result = await fetchWithScraperAPI(robotsUrl);
        if (result) return { status: result.status, body: result.html, headers: result.headers, usedScraperAPI: true };
      } catch { /* fallback failed */ }
    }

    return { status, body, headers, usedScraperAPI: false };
  } catch {
    try {
      const result = await fetchWithScraperAPI(robotsUrl);
      if (result) return { status: result.status, body: result.html, headers: result.headers, usedScraperAPI: true };
    } catch { /* fallback failed */ }
    return { status: null, body: '', headers: {}, usedScraperAPI: false };
  }
}
