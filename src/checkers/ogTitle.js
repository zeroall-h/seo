import * as cheerio from 'cheerio';

const OG_TITLE_WARN_LENGTH = 80;
const OG_TITLE_MAX_LENGTH = 100;

function detectRepeatedKeywords(text) {
  const words = text.split(/\s+/).filter(w => w.length > 1);
  const freq = {};
  for (const w of words) { const key = w.toLowerCase(); freq[key] = (freq[key] || 0) + 1; }
  return Object.entries(freq).filter(([, count]) => count >= 3).map(([word]) => word);
}

export function checkOgTitle(html) {
  if (!html) {
    return { pass: false, message: '접속 실패', details: [] };
  }

  const $ = cheerio.load(html);
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || null;
  const title = $('head title').first().text().trim();

  const details = [];
  let pass = true;

  if (!ogTitle) {
    details.push({ type: 'warn', text: 'og:title 태그 없음 - 소셜 공유 및 네이버 검색 활용도 저하 가능' });
    details.push({ type: 'tip', text: '<meta property="og:title" content="페이지 제목">을 <head> 안에 추가하세요.' });
    if (title) details.push({ type: 'info', text: `대신 title 태그 존재: "${title}"` });
    return { pass: false, message: 'og:title 없음', details };
  }

  details.push({ type: 'info', text: `og:title: "${ogTitle}"` });

  const len = ogTitle.length;
  if (len > OG_TITLE_MAX_LENGTH) {
    details.push({ type: 'warn', text: `og:title이 너무 김 (${len}자)` });
    pass = false;
  } else if (len > OG_TITLE_WARN_LENGTH) {
    details.push({ type: 'warn', text: `og:title이 다소 긴 편 (${len}자)` });
    details.push({ type: 'tip', text: `${OG_TITLE_WARN_LENGTH}자 이내로 작성하세요.` });
    pass = false;
  } else if (len > 40) {
    details.push({ type: 'warn', text: `og:title이 다소 긴 편 (${len}자)` });
    details.push({ type: 'tip', text: '사용자가 쉽게 사이트를 파악할 수 있도록 40자 이내로 제목을 작성해주세요.' });
    pass = false;
  } else {
    details.push({ type: 'info', text: `og:title 길이 양호 (${len}자)` });
  }

  const repeated = detectRepeatedKeywords(ogTitle);
  if (repeated.length > 0) {
    details.push({ type: 'warn', text: `반복 키워드 감지: ${repeated.map(w => `"${w}"`).join(', ')}` });
    pass = false;
  }

  if (title && ogTitle !== title) {
    details.push({ type: 'info', text: `title 태그와 다름: "${title}" → 검색엔진이 적합한 것을 선택` });
  } else if (title) {
    details.push({ type: 'info', text: 'title 태그와 동일' });
  }

  const warn = !pass && len > 40;
  const message = pass ? `og:title 정상 (${len}자)` : `og:title 문제 있음 (${len}자)`;

  return { pass, warn, message, details };
}
