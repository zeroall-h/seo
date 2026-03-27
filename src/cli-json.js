#!/usr/bin/env node
/**
 * SEO Checker - JSON 출력 CLI
 * n8n Execute Command 노드에서 호출하여 사용
 *
 * 사용법: node src/cli-json.js <URL>
 * 출력: JSON (stdout)
 */
import { fetchPage, fetchHttpStatus, fetchRobotsTxt } from './utils/fetchPage.js';
import { checkHttpStatus } from './checkers/httpStatus.js';
import { checkRobotsTxt } from './checkers/robotsTxt.js';
import { checkRobotsMeta } from './checkers/robotsMeta.js';
import { checkTitleTag } from './checkers/titleTag.js';
import { checkMetaDescription } from './checkers/metaDescription.js';
import { checkOgTitle } from './checkers/ogTitle.js';
import { checkOgDescription } from './checkers/ogDescription.js';

function normalizeUrl(input) {
  if (/^https?:\/\//i.test(input)) return input;
  return `https://${input}`;
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.log(JSON.stringify({ error: 'URL이 필요합니다.' }));
    process.exit(1);
  }

  const url = normalizeUrl(input);

  try {
    const [httpData, pageData, robotsData] = await Promise.all([
      fetchHttpStatus(url),
      fetchPage(url),
      fetchRobotsTxt(url),
    ]);

    const result = {
      url,
      checks: [
        { name: 'HTTP 상태코드',                    key: 'http',       ...checkHttpStatus(httpData) },
        { name: 'robots.txt',                       key: 'robots',     ...checkRobotsTxt(robotsData) },
        { name: '로봇 메타 태그',                    key: 'robotsMeta', ...checkRobotsMeta(pageData.html) },
        { name: '페이지 제목 (title)',               key: 'title',      ...checkTitleTag(pageData.html) },
        { name: '사이트 설명 (meta description)',    key: 'desc',       ...checkMetaDescription(pageData.html) },
        { name: 'Open Graph 제목 (og:title)',        key: 'ogTitle',    ...checkOgTitle(pageData.html) },
        { name: 'Open Graph 설명 (og:description)',  key: 'ogDesc',     ...checkOgDescription(pageData.html) },
      ],
    };

    console.log(JSON.stringify(result));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

main();
