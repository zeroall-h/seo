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
    details.push({ type: 'warn', text: 'Sitemap 지시자 없음' });
    details.push({ type: 'tip', text: '내 사이트에 있는 페이지들의 목록이 담겨있는 sitemap.xml의 위치를 robots.txt에 기록해서 검색 로봇이 내 사이트의 콘텐츠를 더 잘 수집할 수 있도록 도울 수 있습니다.\n\nUser-agent: *\nAllow: /\nSitemap: http://www.example.com/sitemap.xml' });
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
      details: [
        { type: 'warn', text: `서버 오류 (HTTP ${code})로 robots.txt에 접근할 수 없습니다.` },
        { type: 'tip', text: 'robots.txt 파일에 작성된 규칙은 같은 호스트, 프로토콜 및 포트 번호 하위의 페이지에 대해서만 유효합니다. 사이트의 콘텐츠 성격에 맞게 변경해주세요.\n\n(예) 네이버 검색로봇만 수집 허용\nUser-agent: *\nDisallow: /\nUser-agent: Yeti\nAllow: /\n\n(예) 모든 검색엔진의 로봇에 대하여 수집 허용\nUser-agent: *\nAllow: /\n\n(예) 사이트의 루트 페이지만 수집 허용\nUser-agent: *\nDisallow: /\nAllow: /$\n\n(예) 특정 경로 수집 비허용\nUser-agent: Yeti\nDisallow: /private*/' },
      ],
    };
  }

  if (code >= 400) {
    return {
      pass: false,
      statusCode: code,
      message: `${code} robots.txt 없음`,
      details: [
        { type: 'warn', text: 'robots.txt 파일이 없음 - 크롤러 제어 불가' },
        { type: 'tip', text: 'robots.txt 파일에 작성된 규칙은 같은 호스트, 프로토콜 및 포트 번호 하위의 페이지에 대해서만 유효합니다. 사이트의 콘텐츠 성격에 맞게 변경해주세요.\n\n(예) 네이버 검색로봇만 수집 허용\nUser-agent: *\nDisallow: /\nUser-agent: Yeti\nAllow: /\n\n(예) 모든 검색엔진의 로봇에 대하여 수집 허용\nUser-agent: *\nAllow: /\n\n(예) 사이트의 루트 페이지만 수집 허용\nUser-agent: *\nDisallow: /\nAllow: /$\n\n(예) 특정 경로 수집 비허용\nUser-agent: Yeti\nDisallow: /private*/' },
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
