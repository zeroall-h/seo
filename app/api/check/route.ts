import { NextRequest, NextResponse } from 'next/server';
import { fetchPage, fetchHttpStatus, fetchRobotsTxt } from '@/lib/fetchPage';
// @ts-expect-error - JS checker modules without type declarations
import { checkHttpStatus } from '@/src/checkers/httpStatus.js';
// @ts-expect-error - JS checker modules without type declarations
import { checkRobotsTxt } from '@/src/checkers/robotsTxt.js';
// @ts-expect-error - JS checker modules without type declarations
import { checkRobotsMeta } from '@/src/checkers/robotsMeta.js';
// @ts-expect-error - JS checker modules without type declarations
import { checkTitleTag } from '@/src/checkers/titleTag.js';
// @ts-expect-error - JS checker modules without type declarations
import { checkMetaDescription } from '@/src/checkers/metaDescription.js';
// @ts-expect-error - JS checker modules without type declarations
import { checkOgTitle } from '@/src/checkers/ogTitle.js';
// @ts-expect-error - JS checker modules without type declarations
import { checkOgDescription } from '@/src/checkers/ogDescription.js';

export const maxDuration = 60;

function normalizeUrl(input: string): string {
  if (/^https?:\/\//i.test(input)) return input;
  return `https://${input}`;
}

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get('url');
  if (!input) {
    return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 });
  }

  const url = normalizeUrl(input);

  try {
    const [httpData, pageData, robotsData] = await Promise.all([
      fetchHttpStatus(url),
      fetchPage(url),
      fetchRobotsTxt(url),
    ]);

    const http = checkHttpStatus(httpData);
    const robots = checkRobotsTxt(robotsData);
    const robotsMeta = checkRobotsMeta(pageData.html);
    const title = checkTitleTag(pageData.html);
    const desc = checkMetaDescription(pageData.html);
    const ogTitle = checkOgTitle(pageData.html);
    const ogDesc = checkOgDescription(pageData.html);

    const headers = { 'Access-Control-Allow-Origin': '*' };

    return NextResponse.json({
      url,
      checks: [
        { name: 'HTTP 상태코드', key: 'http', ...http },
        { name: 'robots.txt', key: 'robots', ...robots },
        { name: '로봇 메타 태그', key: 'robotsMeta', ...robotsMeta },
        { name: '페이지 제목 (title)', key: 'title', ...title },
        { name: '사이트 설명 (meta description)', key: 'desc', ...desc },
        { name: 'Open Graph 제목 (og:title)', key: 'ogTitle', ...ogTitle },
        { name: 'Open Graph 설명 (og:description)', key: 'ogDesc', ...ogDesc },
      ],
    }, { headers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }
}
