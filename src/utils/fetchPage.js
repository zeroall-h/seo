import axios from 'axios';

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const TIMEOUT = 15000;

let puppeteerExtra = null;
let browserAvailable = null;

async function loadPuppeteer() {
  if (browserAvailable === false) return null;
  if (puppeteerExtra) return puppeteerExtra;
  try {
    const mod = await import('puppeteer-extra');
    const stealth = await import('puppeteer-extra-plugin-stealth');
    puppeteerExtra = mod.default;
    puppeteerExtra.use(stealth.default());
    // 테스트 실행으로 브라우저 사용 가능 여부 확인
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    const browser = await puppeteerExtra.launch({
      headless: 'new',
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    await browser.close();
    browserAvailable = true;
    return puppeteerExtra;
  } catch {
    browserAvailable = false;
    return null;
  }
}

function isCloudflareChallenge(status, body, headers = {}) {
  if (status === 403) {
    const cfMitigated = (headers['cf-mitigated'] || '').toString();
    const server = (headers['server'] || '').toString();
    if (cfMitigated.includes('challenge') || server.toLowerCase() === 'cloudflare') return true;
    if (typeof body === 'string' && body.includes('cdn-cgi/challenge-platform')) return true;
  }
  return false;
}

function needsBrowserRendering(html) {
  if (!html || html.trim().length < 200) return true;
  const hasTitle = /<title[^>]*>.+<\/title>/is.test(html);
  const hasBody = /<body[^>]*>.{100,}/is.test(html);
  return !hasTitle && !hasBody;
}

async function fetchWithBrowser(url) {
  const pptr = await loadPuppeteer();
  if (!pptr) return null;

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  const browser = await pptr.launch({
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
    const headers = response.headers;
    axiosResult = { status, html, headers, usedPuppeteer: false };

    if (!isCloudflareChallenge(status, html, headers) && !needsBrowserRendering(html)) {
      return axiosResult;
    }
  } catch {
    // axios 실패 시 axiosResult는 null
  }

  // 브라우저 폴백 시도
  try {
    const browserResult = await fetchWithBrowser(url);
    if (browserResult) return browserResult;
  } catch {
    // 브라우저도 실패
  }

  // 브라우저 없으면 axios 결과라도 반환
  return axiosResult || { status: null, html: '', headers: {}, usedPuppeteer: false };
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
      try {
        const result = await fetchWithBrowser(url);
        if (result) return { status: result.status, headers: result.headers, usedPuppeteer: true };
      } catch { /* 폴백 실패 */ }
    }

    return { status, headers, usedPuppeteer: false };
  } catch {
    try {
      const result = await fetchWithBrowser(url);
      if (result) return { status: result.status, headers: result.headers, usedPuppeteer: true };
    } catch { /* 폴백 실패 */ }
    return { status: null, headers: {}, usedPuppeteer: false };
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
      try {
        const result = await fetchWithBrowser(robotsUrl);
        if (result) return { status: result.status, body: result.html, headers: result.headers, usedPuppeteer: true };
      } catch { /* 폴백 실패 */ }
    }

    return { status, body, headers, usedPuppeteer: false };
  } catch {
    try {
      const result = await fetchWithBrowser(robotsUrl);
      if (result) return { status: result.status, body: result.html, headers: result.headers, usedPuppeteer: true };
    } catch { /* 폴백 실패 */ }
    return { status: null, body: '', headers: {}, usedPuppeteer: false };
  }
}
