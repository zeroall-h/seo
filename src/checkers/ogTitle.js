import axios from 'axios';
import * as cheerio from 'cheerio';

// 네이버 가이드 기준: og:title도 title 태그와 동일한 길이 기준 적용
const OG_TITLE_WARN_LENGTH = 80;
const OG_TITLE_MAX_LENGTH = 100;

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

export async function checkOgTitle(url) {
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
        message: `HTML 문서가 아님 (${contentType || '없음'}) - og:title 검사 건너뜀`,
        details: [],
      };
    }

    const $ = cheerio.load(response.data);
    const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || null;
    const title = $('head title').first().text().trim();

    const details = [];
    let pass = true;

    // og:title 없음
    if (!ogTitle) {
      details.push({ type: 'warn', text: 'og:title 태그 없음 - 소셜 공유 및 네이버 검색 활용도 저하 가능' });
      details.push({ type: 'tip', text: '<meta property="og:title" content="페이지 제목">을 <head> 안에 추가하세요. 소셜 미디어 공유 및 네이버 검색 결과에서 페이지 제목으로 활용됩니다.' });
      if (title) {
        details.push({ type: 'info', text: `대신 title 태그 존재: "${title}"` });
      }
      return { pass: false, message: 'og:title 없음', details };
    }

    details.push({ type: 'info', text: `og:title: "${ogTitle}"` });

    // 길이 검사
    const len = ogTitle.length;
    if (len > OG_TITLE_MAX_LENGTH) {
      details.push({ type: 'warn', text: `og:title이 너무 김 (${len}자) - 소셜/검색 표시 시 잘릴 수 있음` });
      details.push({ type: 'tip', text: `${OG_TITLE_WARN_LENGTH}자 이내로 줄여주세요. 소셜 미디어와 검색 결과 모두에서 제목이 잘리지 않고 표시됩니다.` });
      pass = false;
    } else if (len > OG_TITLE_WARN_LENGTH) {
      details.push({ type: 'warn', text: `og:title이 다소 긴 편 (${len}자) - 검색 결과에서 잘릴 수 있음` });
      details.push({ type: 'tip', text: `${OG_TITLE_WARN_LENGTH}자 이내로 작성하면 소셜 공유 미리보기에서 제목이 온전히 표시됩니다.` });
      pass = false;
    } else if (len > 40) {
      details.push({ type: 'warn', text: `og:title이 다소 긴 편 (${len}자)` });
      details.push({ type: 'tip', text: '사용자가 쉽게 사이트를 파악할 수 있도록 40자 이내로 제목을 작성해주세요.' });
      pass = false;
    } else {
      details.push({ type: 'info', text: `og:title 길이 양호 (${len}자)` });
    }

    // 반복 키워드 검사
    const repeated = detectRepeatedKeywords(ogTitle);
    if (repeated.length > 0) {
      details.push({ type: 'warn', text: `반복 키워드 감지: ${repeated.map(w => `"${w}"`).join(', ')} - 검색 노출 불이익 가능` });
      details.push({ type: 'tip', text: '동일 키워드를 3회 이상 반복하면 스팸으로 간주될 수 있습니다. 페이지를 잘 나타내는 자연스러운 제목으로 수정하세요.' });
      pass = false;
    }

    // title 태그와 비교
    if (title && ogTitle !== title) {
      details.push({ type: 'info', text: `title 태그와 다름: "${title}" → 검색엔진이 적합한 것을 선택` });
    } else if (title && ogTitle === title) {
      details.push({ type: 'info', text: 'title 태그와 동일' });
    }

    const warn = !pass && len > 40;
    const message = pass
      ? `og:title 정상 (${len}자)`
      : `og:title 문제 있음 (${len}자)`;

    return { pass, warn, message, details };
  } catch (error) {
    return {
      pass: false,
      message: `접속 실패 - ${error.message}`,
      details: [],
    };
  }
}
