import * as cheerio from 'cheerio';

const OG_DESC_WARN_LENGTH = 200;
const OG_DESC_MAX_LENGTH = 300;

function detectRepeatedKeywords(text) {
  const words = text.split(/\s+/).filter(w => w.length > 1);
  const freq = {};
  for (const w of words) { const key = w.toLowerCase(); freq[key] = (freq[key] || 0) + 1; }
  return Object.entries(freq).filter(([, count]) => count >= 3).map(([word]) => word);
}

export function checkOgDescription(html) {
  if (!html) {
    return { pass: false, message: '접속 실패', details: [] };
  }

  const $ = cheerio.load(html);
  const ogDesc = $('meta[property="og:description"]').attr('content')?.trim() || null;
  const metaDesc = $('meta').filter((_, el) => ($(el).attr('name') || '').toLowerCase() === 'description').attr('content')?.trim() || null;

  const details = [];
  let pass = true;

  if (!ogDesc) {
    details.push({ type: 'warn', text: 'og:description 태그 없음 - 소셜 공유 및 네이버 검색 활용도 저하 가능' });
    details.push({ type: 'tip', text: '<meta property="og:description" content="페이지 설명">을 <head> 안에 추가하세요.\n네이버 블로그, 카페, 페이스북, 인스타그램 등 소셜 미디어에서 공유될 때 올바른 설명이 표시되도록 Open Graph 태그를 설정하세요. 사이트 연관 채널 정보를 함께 마크업하면 온라인 브랜딩에 도움이 됩니다.' });
    if (metaDesc) details.push({ type: 'info', text: `대신 meta description 존재: "${metaDesc}"` });
    return { pass: false, message: 'og:description 없음', details };
  }

  details.push({ type: 'info', text: `og:description: "${ogDesc}"` });

  const len = ogDesc.length;
  if (len > OG_DESC_MAX_LENGTH) {
    details.push({ type: 'warn', text: `og:description이 너무 김 (${len}자)` });
    pass = false;
  } else if (len > OG_DESC_WARN_LENGTH) {
    details.push({ type: 'warn', text: `og:description이 다소 긴 편 (${len}자)` });
    pass = false;
  } else if (len > 80) {
    details.push({ type: 'warn', text: `og:description이 다소 긴 편 (${len}자)` });
    details.push({ type: 'tip', text: '사용자가 쉽게 사이트를 파악할 수 있도록 80자 이내로 설명문을 작성해주세요.' });
    pass = false;
  } else if (len < 10) {
    details.push({ type: 'warn', text: `og:description이 너무 짧음 (${len}자)` });
    pass = false;
  } else {
    details.push({ type: 'info', text: `og:description 길이 양호 (${len}자)` });
  }

  const repeated = detectRepeatedKeywords(ogDesc);
  if (repeated.length > 0) {
    details.push({ type: 'warn', text: `반복 키워드 감지: ${repeated.map(w => `"${w}"`).join(', ')}` });
    pass = false;
  }

  if (metaDesc && ogDesc === metaDesc) {
    details.push({ type: 'info', text: 'meta description과 동일' });
  } else if (metaDesc) {
    details.push({ type: 'info', text: `meta description과 다름: "${metaDesc}"` });
  }

  const warn = !pass && len > 80;
  const message = pass ? `og:description 정상 (${len}자)` : `og:description 문제 있음 (${len}자)`;

  return { pass, warn, message, details };
}
