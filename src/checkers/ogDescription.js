import axios from 'axios';
import * as cheerio from 'cheerio';

// 네이버 가이드 기준: 1-2문장, 간결하게
const OG_DESC_WARN_LENGTH = 200;
const OG_DESC_MAX_LENGTH = 300;

function detectRepeatedKeywords(text) {
  const words = text.split(/\s+/).filter(w => w.length > 1);
  const freq = {};
  for (const w of words) {
    const key = w.toLowerCase();
    freq[key] = (freq[key] || 0) + 1;
  }
  return Object.entries(freq)
    .filter(([, count]) => count >= 3)
    .map(([word]) => word);
}

export async function checkOgDescription(url) {
  try {
    const response = await axios.get(url, {
      maxRedirects: 5,
      timeout: 10000,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOChecker/1.0)' },
    });

    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      return {
        pass: true,
        message: `HTML 문서가 아님 (${contentType || '없음'}) - og:description 검사 건너뜀`,
        details: [],
      };
    }

    const $ = cheerio.load(response.data);
    const ogDesc = $('meta[property="og:description"]').attr('content')?.trim() || null;
    const metaDesc = $('meta').filter((_, el) => ($(el).attr('name') || '').toLowerCase() === 'description').attr('content')?.trim() || null;

    const details = [];
    let pass = true;

    // og:description 없음
    if (!ogDesc) {
      details.push({ type: 'warn', text: 'og:description 태그 없음 - 소셜 공유 및 네이버 검색 활용도 저하 가능' });
      details.push({ type: 'tip', text: '<meta property="og:description" content="페이지 설명">을 <head> 안에 추가하세요. 소셜 미디어 공유 시 표시되는 설명으로, 1~2문장의 간결한 내용을 권장합니다.' });
      if (metaDesc) {
        details.push({ type: 'info', text: `대신 meta description 존재: "${metaDesc}"` });
      }
      return { pass: false, message: 'og:description 없음', details };
    }

    details.push({ type: 'info', text: `og:description: "${ogDesc}"` });

    // 길이 검사
    const len = ogDesc.length;
    if (len > OG_DESC_MAX_LENGTH) {
      details.push({ type: 'warn', text: `og:description이 너무 김 (${len}자) - 소셜/검색 표시 시 잘릴 수 있음` });
      details.push({ type: 'tip', text: `${OG_DESC_WARN_LENGTH}자 이내로 줄여주세요. 소셜 미디어에서 설명이 잘리지 않고 사용자에게 온전히 전달됩니다.` });
      pass = false;
    } else if (len > OG_DESC_WARN_LENGTH) {
      details.push({ type: 'warn', text: `og:description이 다소 긴 편 (${len}자) - 검색 결과에서 잘릴 수 있음` });
      details.push({ type: 'tip', text: `${OG_DESC_WARN_LENGTH}자 이내로 작성하면 소셜 공유 미리보기에서 설명이 온전히 표시됩니다.` });
      pass = false;
    } else if (len > 80) {
      details.push({ type: 'warn', text: `og:description이 다소 긴 편 (${len}자)` });
      details.push({ type: 'tip', text: '사용자가 쉽게 사이트를 파악할 수 있도록 80자 이내로 설명문을 작성해주세요.' });
      pass = false;
    } else if (len < 10) {
      details.push({ type: 'warn', text: `og:description이 너무 짧음 (${len}자) - 내용을 충분히 설명하지 못할 수 있음` });
      details.push({ type: 'tip', text: '페이지의 핵심 내용을 담은 1~2문장(30~200자)으로 작성하세요. 사용자가 링크를 클릭하고 싶어질 만한 설명이 좋습니다.' });
      pass = false;
    } else {
      details.push({ type: 'info', text: `og:description 길이 양호 (${len}자)` });
    }

    // 반복 키워드 검사
    const repeated = detectRepeatedKeywords(ogDesc);
    if (repeated.length > 0) {
      details.push({ type: 'warn', text: `반복 키워드 감지: ${repeated.map(w => `"${w}"`).join(', ')} - 검색 노출 불이익 가능` });
      details.push({ type: 'tip', text: '동일 키워드를 3회 이상 반복하면 스팸으로 간주될 수 있습니다. 자연스러운 문장으로 페이지를 설명하세요.' });
      pass = false;
    }

    // meta description과 비교
    if (metaDesc && ogDesc === metaDesc) {
      details.push({ type: 'info', text: 'meta description과 동일' });
    } else if (metaDesc && ogDesc !== metaDesc) {
      details.push({ type: 'info', text: `meta description과 다름: "${metaDesc}" → 검색엔진이 적합한 것을 선택` });
    }

    const warn = !pass && len > 80;
    const message = pass
      ? `og:description 정상 (${len}자)`
      : `og:description 문제 있음 (${len}자)`;

    return { pass, warn, message, details };
  } catch (error) {
    return {
      pass: false,
      message: `접속 실패 - ${error.message}`,
      details: [],
    };
  }
}
