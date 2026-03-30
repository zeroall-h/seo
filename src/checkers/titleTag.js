import * as cheerio from 'cheerio';

const TITLE_WARN_LENGTH = 40;
const TITLE_MAX_LENGTH = 100;

function detectRepeatedKeywords(title) {
  const words = title.split(/\s+/).filter(w => w.length > 1);
  const freq = {};
  for (const w of words) { const key = w.toLowerCase(); freq[key] = (freq[key] || 0) + 1; }
  return Object.entries(freq).filter(([, count]) => count >= 3).map(([word]) => word);
}

export function checkTitleTag(html) {
  if (!html) {
    return { pass: false, message: '접속 실패', details: [] };
  }

  const $ = cheerio.load(html);
  const title = $('head title').first().text().trim();
  const details = [];
  let pass = true;

  if (!title) {
    return {
      pass: false,
      message: 'title 태그 없음 - 검색 노출에 불이익',
      details: [
        { type: 'tip', text: '<head> 태그 안에 <title>페이지 제목</title>을 추가하세요. 브랜드명이나 콘텐츠 주제를 담은 고유한 제목을 사용하는 것이 좋습니다.' },
        { type: 'tip', text: '사이트 제목과 설명은 검색엔진에서 엄격하게 관리합니다. 모든 페이지의 제목을 동일하게 표현하지 말고, 각 페이지의 콘텐츠 주제를 정확하게 설명할 수 있는 고유한 문구를 적어주세요.' },
      ],
    };
  }

  details.push({ type: 'info', text: `title: "${title}"` });

  const len = title.length;
  if (len > TITLE_MAX_LENGTH) {
    details.push({ type: 'warn', text: `제목이 너무 김 (${len}자) - 사용자가 사이트 파악 어려울 수 있음` });
    details.push({ type: 'tip', text: `모든 페이지의 제목을 동일하게 표현하지 마세요. 페이지의 제목은 콘텐츠 주제를 정확하게 설명할 수 있는 문구를 적어야 합니다. ${TITLE_WARN_LENGTH}자 이내로 핵심 키워드를 앞쪽에 배치하세요.` });
    pass = false;
  } else if (len > TITLE_WARN_LENGTH) {
    details.push({ type: 'warn', text: `제목이 다소 긴 편 (${len}자) - 검색 결과에서 잘릴 수 있음` });
    details.push({ type: 'tip', text: `모든 페이지의 제목을 동일하게 표현하지 마세요. 페이지의 제목은 콘텐츠 주제를 정확하게 설명할 수 있는 문구를 적어야 합니다. ${TITLE_WARN_LENGTH}자 이내로 작성해주세요.` });
    pass = false;
  } else {
    details.push({ type: 'info', text: `제목 길이 양호 (${len}자)` });
    details.push({ type: 'tip', text: '모든 페이지의 제목을 동일하게 표현하지 마세요. 각 페이지마다 콘텐츠 주제를 정확하게 설명할 수 있는 고유한 제목을 사용해야 검색 노출에 유리합니다.\n중복된 콘텐츠가 있는 여러 사이트를 운영하면 검색 노출에 불이익을 받을 수 있으니 유의하세요.' });
  }

  const repeated = detectRepeatedKeywords(title);
  if (repeated.length > 0) {
    details.push({ type: 'warn', text: `반복 키워드 감지: ${repeated.map(w => `"${w}"`).join(', ')} - 검색 노출 불이익 가능` });
    details.push({ type: 'tip', text: '동일 키워드를 3회 이상 반복하면 스팸으로 간주될 수 있습니다. 각 키워드는 자연스러운 문장 안에서 1~2회만 사용하세요.' });
    pass = false;
  }

  const warn = !pass && len > TITLE_WARN_LENGTH;
  const message = pass ? `title 태그 정상 (${len}자)` : `title 태그 문제 있음 (${len}자)`;

  return { pass, warn, message, details };
}
