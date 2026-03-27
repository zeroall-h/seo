function parseRobotsContent(content) {
  const details = [];
  const lines = content.split('\n').map(l => l.trim());

  let inStarBlock = false;
  let starDisallowAll = false;
  let starAllowRoot = false;
  let hasSitemap = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('user-agent:')) {
      const agent = line.split(':')[1]?.trim();
      inStarBlock = agent === '*';
    } else if (lower.startsWith('disallow:') && inStarBlock) {
      const path = line.split(':')[1]?.trim();
      if (path === '/') starDisallowAll = true;
    } else if (lower.startsWith('allow:') && inStarBlock) {
      const path = line.split(':')[1]?.trim();
      if (path === '/' || path === '') starAllowRoot = true;
    } else if (lower.startsWith('sitemap:')) {
      hasSitemap = true;
    }
  }

  if (starDisallowAll && !starAllowRoot) {
    details.push({ type: 'warn', text: 'User-agent: * 에 Disallow: / 설정됨 (모든 크롤러 전체 차단)' });
  }

  if (hasSitemap) {
    details.push({ type: 'info', text: 'Sitemap 지시자 있음' });
  } else {
    details.push({ type: 'info', text: 'Sitemap 지시자 없음 (sitemap.xml 등록 권장)' });
  }

  return details;
}

export function checkRobotsTxt(prefetched) {
  const code = prefetched.status;

  if (!code) {
    return { pass: false, statusCode: null, message: '접속 실패', details: [] };
  }

  if (code >= 500) {
    return {
      pass: false,
      statusCode: code,
      message: `${code} 서버 오류 - robots.txt 접근 불가`,
      details: [],
    };
  }

  if (code >= 400) {
    return {
      pass: false,
      statusCode: code,
      message: `${code} robots.txt 없음`,
      details: [
        { type: 'warn', text: 'robots.txt 파일이 없음 - 크롤러 제어 불가' },
        { type: 'tip', text: '사이트 루트(예: https://example.com/robots.txt)에 robots.txt 파일을 추가하세요. 크롤링을 허용할 경로와 차단할 경로를 명시적으로 지정할 수 있으며, Sitemap 위치도 함께 안내할 수 있습니다.\n예시)\nUser-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml' },
      ],
    };
  }

  const contentType = prefetched.headers['content-type'] || '';
  const isPlainText = contentType.includes('text/plain');
  const details = [];

  if (!isPlainText) {
    details.push({ type: 'warn', text: `Content-Type이 text/plain 이 아님 (${contentType || '없음'}) - 유효한 규칙으로 인식되지 않을 수 있음` });
  }

  const contentDetails = parseRobotsContent(prefetched.body || '');
  details.push(...contentDetails);

  return {
    pass: true,
    statusCode: code,
    message: `${code} robots.txt 정상 접근${isPlainText ? ' (text/plain)' : ''}`,
    details,
  };
}
