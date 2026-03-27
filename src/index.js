#!/usr/bin/env node
import chalk from 'chalk';
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

function printResult(label, result) {
  if (result.pass) {
    const codeStr = result.code ? `${result.code} ` : '';
    console.log(`  ✅ ${chalk.green(`${codeStr}${result.message}`)}`);
  } else {
    const codeStr = result.code ? `${result.code} ` : '';
    console.log(`  ❌ ${chalk.red(`${codeStr}${result.message}`)}`);
  }
  if (result.location) {
    console.log(`     ${chalk.gray(`→ ${result.location}`)}`);
  }
  for (const detail of (result.details || [])) {
    if (detail.type === 'warn') {
      console.log(`     ${chalk.yellow(`⚠️  ${detail.text}`)}`);
    } else if (detail.type === 'tip') {
      console.log(`     ${chalk.blue(`💡 ${detail.text}`)}`);
    } else {
      console.log(`     ${chalk.gray(`ℹ️  ${detail.text}`)}`);
    }
  }
  console.log();
}

async function main() {
  const input = process.argv[2];

  if (!input) {
    console.log(chalk.yellow('사용법: node src/index.js <URL>'));
    console.log(chalk.yellow('예시:   node src/index.js https://www.naver.com'));
    process.exit(1);
  }

  const url = normalizeUrl(input);

  console.log(chalk.bold('\n🔍 SEO Checker - 분석 시작'));
  console.log(chalk.gray(`URL: ${url}\n`));

  // 페이지 데이터 한 번에 가져오기 (Cloudflare 시 Puppeteer 폴백)
  console.log(chalk.gray('📡 페이지 데이터 수집 중...\n'));

  const [httpData, pageData, robotsData] = await Promise.all([
    fetchHttpStatus(url),
    fetchPage(url),
    fetchRobotsTxt(url),
  ]);

  if (pageData.usedPuppeteer) {
    console.log(chalk.cyan('🌐 Cloudflare 감지 → 헤드리스 브라우저로 페이지 로드 완료\n'));
  }

  console.log(chalk.bold('[1/7] HTTP 상태코드'));
  printResult('HTTP', checkHttpStatus(httpData));

  console.log(chalk.bold('[2/7] robots.txt'));
  printResult('robots.txt', checkRobotsTxt(robotsData));

  console.log(chalk.bold('[3/7] 로봇 메타 태그'));
  printResult('로봇 메타', checkRobotsMeta(pageData.html));

  console.log(chalk.bold('[4/7] 페이지 제목 (title 태그)'));
  printResult('title', checkTitleTag(pageData.html));

  console.log(chalk.bold('[5/7] 사이트 설명 (meta description)'));
  printResult('description', checkMetaDescription(pageData.html));

  console.log(chalk.bold('[6/7] Open Graph 제목 (og:title)'));
  printResult('og:title', checkOgTitle(pageData.html));

  console.log(chalk.bold('[7/7] Open Graph 설명 (og:description)'));
  printResult('og:description', checkOgDescription(pageData.html));
}

main();
