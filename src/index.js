#!/usr/bin/env node
import chalk from 'chalk';
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
    console.log(chalk.yellow('사용법: node src/index.js <URL>'));
    console.log(chalk.yellow('예시:   node src/index.js https://www.naver.com'));
    process.exit(1);
  }

  const url = normalizeUrl(input);

  console.log(chalk.bold('\n🔍 SEO Checker - 분석 시작'));
  console.log(chalk.gray(`URL: ${url}\n`));

  console.log(chalk.bold('[1/5] HTTP 상태코드'));

  const result = await checkHttpStatus(url);

  if (result.pass) {
    const codeStr = result.code ? `${result.code} ` : '';
    console.log(`  ✅ ${chalk.green(`${codeStr}${result.message}`)}`);
    if (result.location) {
      console.log(`     ${chalk.gray(`→ ${result.location}`)}`);
    }
  } else {
    const codeStr = result.code ? `${result.code} ` : '';
    console.log(`  ❌ ${chalk.red(`${codeStr}${result.message}`)}`);
    if (result.location) {
      console.log(`     ${chalk.gray(`→ ${result.location}`)}`);
    }
  }

  console.log();
  console.log(chalk.bold('[2/5] robots.txt'));

  const robotsResult = await checkRobotsTxt(url);

  if (robotsResult.pass) {
    console.log(`  ✅ ${chalk.green(robotsResult.message)}`);
  } else {
    console.log(`  ❌ ${chalk.red(robotsResult.message)}`);
  }

  for (const detail of robotsResult.details) {
    if (detail.type === 'warn') {
      console.log(`     ${chalk.yellow(`⚠️  ${detail.text}`)}`);
    } else {
      console.log(`     ${chalk.gray(`ℹ️  ${detail.text}`)}`);
    }
  }

  console.log();
  console.log(chalk.bold('[3/5] 로봇 메타 태그'));

  const metaResult = await checkRobotsMeta(url);

  if (metaResult.pass) {
    console.log(`  ✅ ${chalk.green(metaResult.message)}`);
  } else {
    console.log(`  ❌ ${chalk.red(metaResult.message)}`);
  }

  for (const detail of metaResult.details) {
    if (detail.type === 'warn') {
      console.log(`     ${chalk.yellow(`⚠️  ${detail.text}`)}`);
    } else {
      console.log(`     ${chalk.gray(`ℹ️  ${detail.text}`)}`);
    }
  }

  console.log();
  console.log(chalk.bold('[4/6] 페이지 제목 (title 태그)'));

  const titleResult = await checkTitleTag(url);

  if (titleResult.pass) {
    console.log(`  ✅ ${chalk.green(titleResult.message)}`);
  } else {
    console.log(`  ❌ ${chalk.red(titleResult.message)}`);
  }

  for (const detail of titleResult.details) {
    if (detail.type === 'warn') {
      console.log(`     ${chalk.yellow(`⚠️  ${detail.text}`)}`);
    } else {
      console.log(`     ${chalk.gray(`ℹ️  ${detail.text}`)}`);
    }
  }

  console.log();
  console.log(chalk.bold('[5/6] 사이트 설명 (meta description)'));

  const descResult = await checkMetaDescription(url);

  if (descResult.pass) {
    console.log(`  ✅ ${chalk.green(descResult.message)}`);
  } else {
    console.log(`  ❌ ${chalk.red(descResult.message)}`);
  }

  for (const detail of descResult.details) {
    if (detail.type === 'warn') {
      console.log(`     ${chalk.yellow(`⚠️  ${detail.text}`)}`);
    } else {
      console.log(`     ${chalk.gray(`ℹ️  ${detail.text}`)}`);
    }
  }

  console.log();
  console.log(chalk.bold('[6/7] Open Graph 제목 (og:title)'));

  const ogTitleResult = await checkOgTitle(url);

  if (ogTitleResult.pass) {
    console.log(`  ✅ ${chalk.green(ogTitleResult.message)}`);
  } else {
    console.log(`  ❌ ${chalk.red(ogTitleResult.message)}`);
  }

  for (const detail of ogTitleResult.details) {
    if (detail.type === 'warn') {
      console.log(`     ${chalk.yellow(`⚠️  ${detail.text}`)}`);
    } else {
      console.log(`     ${chalk.gray(`ℹ️  ${detail.text}`)}`);
    }
  }

  console.log();
  console.log(chalk.bold('[7/7] Open Graph 설명 (og:description)'));

  const ogDescResult = await checkOgDescription(url);

  if (ogDescResult.pass) {
    console.log(`  ✅ ${chalk.green(ogDescResult.message)}`);
  } else {
    console.log(`  ❌ ${chalk.red(ogDescResult.message)}`);
  }

  for (const detail of ogDescResult.details) {
    if (detail.type === 'warn') {
      console.log(`     ${chalk.yellow(`⚠️  ${detail.text}`)}`);
    } else {
      console.log(`     ${chalk.gray(`ℹ️  ${detail.text}`)}`);
    }
  }

  console.log();
}

main();
