import axios from 'axios';
import * as cheerio from 'cheerio';

// 네이버 가이드 기준: 1-2 문장의 짧은 단락 권장
const DESC_WARN_LENGTH = 160;
const DESC_MAX_LENGTH = 300;

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

export async function checkMetaDescription(url) {
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
        message: `HTML 문서가 아님 (${contentType || '없음'}) - description 검사 건너뜀`,
        details: [],
      };
    }

    const $ = cheerio.load(response.data);
    const title = $('head title').first().text().trim();
    const desc = $('meta').filter((_, el) => ($(el).attr('name') || '').toLowerCase() === 'description').attr('content')?.trim() || null;
    const ogDesc = $('meta[property="og:description"]').attr('content')?.trim() || null;

    const details = [];
    let pass = true;

    // description 없음
    if (!desc) {
      details.push({ type: 'warn', text: 'meta description 없음 - 검색 스니펫 자동 추출에 의존하게 됨' });
      details.push({ type: 'tip', text: '<head> 태그 안에 <meta name="description" content="페이지 설명">을 추가하세요. 페이지 내용을 간략히 요약한 1~2문장(160자 이내)으로 작성하는 것이 좋습니다.' });
      pass = false;

      if (ogDesc) {
        details.push({ type: 'info', text: `og:description: "${ogDesc}"` });
        details.push({ type: 'warn', text: 'og:description만 있음 - meta description도 별도 추가 권장' });
      } else {
        details.push({ type: 'warn', text: 'og:description도 없음 - 소셜 공유 및 검색 활용도 저하 가능' });
      }

      return {
        pass,
        message: 'meta description 없음',
        details,
      };
    }

    details.push({ type: 'info', text: `description: "${desc}"` });

    // 길이 검사
    const len = desc.length;
    if (len > DESC_MAX_LENGTH) {
      details.push({ type: 'warn', text: `설명이 너무 김 (${len}자) - 사용자가 사이트 파악 어려울 수 있음` });
      details.push({ type: 'tip', text: `설명을 ${DESC_WARN_LENGTH}자 이내로 줄여주세요. 전체 내용을 복사하지 말고 핵심 내용만 간추려 1~2문장으로 작성하세요.` });
      pass = false;
    } else if (len > DESC_WARN_LENGTH) {
      details.push({ type: 'warn', text: `설명이 다소 긴 편 (${len}자) - 검색 결과에서 잘릴 수 있음` });
      details.push({ type: 'tip', text: `${DESC_WARN_LENGTH}자 이내로 작성하면 검색 결과에서 설명이 잘리지 않습니다.` });
      pass = false;
    } else if (len > 80) {
      details.push({ type: 'warn', text: `설명이 다소 긴 편 (${len}자)` });
      details.push({ type: 'tip', text: '사용자가 쉽게 사이트를 파악할 수 있도록 80자 이내로 설명문을 작성해주세요.' });
      pass = false;
    } else {
      details.push({ type: 'info', text: `설명 길이 양호 (${len}자)` });
    }

    // title과 동일한지 검사
    if (title && desc === title) {
      details.push({ type: 'warn', text: '제목(title)과 설명이 동일 - 검색 노출 불이익 가능' });
      details.push({ type: 'tip', text: '설명은 제목과 다르게 작성해야 합니다. 페이지 내용을 구체적으로 풀어 쓴 1~2문장으로 작성하세요.' });
      pass = false;
    }

    // 반복 키워드 검사
    const repeated = detectRepeatedKeywords(desc);
    if (repeated.length > 0) {
      details.push({ type: 'warn', text: `반복 키워드 감지: ${repeated.map(w => `"${w}"`).join(', ')} - 검색 노출 불이익 가능` });
      details.push({ type: 'tip', text: '동일 키워드를 3회 이상 반복하면 스팸으로 간주될 수 있습니다. 자연스러운 문장으로 페이지를 설명하세요.' });
      pass = false;
    }

    // og:description 검사
    if (ogDesc) {
      details.push({ type: 'info', text: `og:description: "${ogDesc}"` });
      if (ogDesc !== desc) {
        details.push({ type: 'info', text: 'og:description이 meta description과 다름 (검색엔진이 적합한 것을 선택)' });
      }
    } else {
      details.push({ type: 'warn', text: 'og:description 없음 - 소셜 공유 및 검색 활용도 저하 가능' });
      details.push({ type: 'tip', text: '<meta property="og:description" content="페이지 설명">을 추가하면 소셜 미디어 공유 시 설명이 올바르게 표시됩니다.' });
    }

    const warn = !pass && len > 80;
    const message = pass
      ? `meta description 정상 (${len}자)`
      : `meta description 문제 있음 (${len}자)`;

    return { pass, warn, message, details };
  } catch (error) {
    return {
      pass: false,
      message: `접속 실패 - ${error.message}`,
      details: [],
    };
  }
}
