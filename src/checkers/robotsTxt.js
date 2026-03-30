/**
 * robots.txt SEO 검사 모듈
 * 네이버 공식 가이드라인 기반
 * https://searchadvisor.naver.com/guide/seo-basic-robots
 */

// ─────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────

/**
 * "Key: Value" 형태의 라인에서 값을 안전하게 추출합니다.
 * Sitemap URL처럼 값에 콜론이 포함된 경우도 올바르게 처리합니다.
 */
function extractValue(line) {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return "";
  return line.slice(colonIndex + 1).trim();
}

/**
 * robots.txt 본문을 파싱하여 SEO 관점의 세부 진단을 반환합니다.
 *
 * @param {string} content - robots.txt 원문
 * @returns {{ type: "info"|"warn"|"tip", text: string }[]}
 */
function parseRobotsContent(content) {
  const details = [];
  const lines = content.split("\n").map((l) => l.trim());

  // ── 파싱 상태 ──
  let currentAgents = []; // 현재 블록의 User-agent 목록
  let inBlock = false;

  // ── 집계 플래그 ──
  let starDisallowAll = false;
  let starAllowRoot = false;
  let yetiExplicitlyAllowed = false;
  let yetiExplicitlyDisallowed = false;
  let hasSitemap = false;
  const sitemapUrls = [];

  // 파비콘·JS·CSS 차단 감지용 패턴
  const sensitivePatterns = [/favicon/i, /\.js($|\s)/i, /\.css($|\s)/i];
  const blockedSensitivePaths = [];

  for (const line of lines) {
    // 빈 줄 → 블록 경계 초기화
    if (line === "" || line.startsWith("#")) {
      if (line === "") {
        currentAgents = [];
        inBlock = false;
      }
      continue;
    }

    const lower = line.toLowerCase();

    if (lower.startsWith("user-agent:")) {
      const agent = extractValue(line);
      // 새 User-agent가 오면 기존 블록 컨텍스트 유지(멀티 User-agent 지원)
      if (!inBlock) {
        currentAgents = [];
        inBlock = true;
      }
      currentAgents.push(agent.toLowerCase());
    } else if (lower.startsWith("disallow:")) {
      const path = extractValue(line);

      // * 블록
      if (currentAgents.includes("*")) {
        if (path === "/") starDisallowAll = true;
      }

      // Yeti 블록
      if (currentAgents.includes("yeti")) {
        if (path === "/") yetiExplicitlyDisallowed = true;
      }

      // 파비콘·JS·CSS 차단 감지
      for (const pattern of sensitivePatterns) {
        if (pattern.test(path) && !blockedSensitivePaths.includes(path)) {
          blockedSensitivePaths.push(path);
        }
      }
    } else if (lower.startsWith("allow:")) {
      const path = extractValue(line);

      // * 블록 — 빈 문자열은 "아무것도 허용하지 않음"이므로 제외
      if (currentAgents.includes("*") && path === "/") {
        starAllowRoot = true;
      }

      // Yeti 블록
      if (currentAgents.includes("yeti") && (path === "/" || path === "")) {
        yetiExplicitlyAllowed = true;
      }
    } else if (lower.startsWith("sitemap:")) {
      hasSitemap = true;
      const url = extractValue(line);
      sitemapUrls.push(url);
      inBlock = false; // Sitemap은 블록 밖에 위치
      currentAgents = [];
    }
  }

  // ─────────────────────────────────────────
  // 진단 1: Yeti 명시적 차단
  // ─────────────────────────────────────────
  if (yetiExplicitlyDisallowed && !yetiExplicitlyAllowed) {
    details.push({
      type: "warn",
      text: "네이버 검색로봇(Yeti)이 명시적으로 차단되어 있습니다. 네이버 검색에 노출되지 않을 수 있습니다.",
    });
    details.push({
      type: "tip",
      text: "Yeti의 수집을 허용하려면 아래와 같이 설정하세요.\n\nUser-agent: Yeti\nAllow: /",
    });
  }

  // ─────────────────────────────────────────
  // 진단 2: Sitemap 누락
  // ─────────────────────────────────────────
  if (!hasSitemap) {
    details.push({
      type: "info",
      text: "sitemap.xml 경로가 지정되지 않았습니다. Sitemap을 등록하면 검색로봇이 사이트 콘텐츠를 더 잘 수집할 수 있습니다.",
    });
    details.push({
      type: "tip",
      text: "robots.txt에 sitemap.xml 위치를 아래와 같이 기록해주세요.\n\nUser-agent: *\nAllow: /\nSitemap: https://www.example.com/sitemap.xml",
    });
  } else {
    // ─────────────────────────────────────────
    // 진단 3: Sitemap URL 절대경로 여부
    // ─────────────────────────────────────────
    const relativeUrls = sitemapUrls.filter(
      (url) => !url.startsWith("http://") && !url.startsWith("https://"),
    );
    if (relativeUrls.length > 0) {
      details.push({
        type: "warn",
        text: `Sitemap 경로가 절대 URL이 아닙니다: ${relativeUrls.join(", ")}\n검색로봇이 올바르게 인식하지 못할 수 있습니다.`,
      });
      details.push({
        type: "tip",
        text: "Sitemap은 반드시 절대 URL로 작성해야 합니다.\n\nSitemap: https://www.example.com/sitemap.xml",
      });
    }
  }

  // ─────────────────────────────────────────
  // 진단 4: 전체 차단(Disallow: /) 설정
  // ─────────────────────────────────────────
  if (starDisallowAll && !starAllowRoot) {
    details.push({
      type: "info",
      text: "robots.txt에 'Disallow: /'가 설정되어 있습니다. 검색엔진이 사이트의 콘텐츠를 수집할 수 있도록 허용 설정을 권장합니다.",
    });

    // Yeti 허용 여부에 따라 팁 분기
    if (yetiExplicitlyAllowed) {
      details.push({
        type: "tip",
        text: "네이버 검색로봇(Yeti)은 별도로 허용되어 있습니다. 다른 검색엔진에도 허용하려면 아래와 같이 설정하세요.\n\nUser-agent: *\nAllow: /",
      });
    } else {
      details.push({
        type: "tip",
        text: "모든 크롤러를 허용하려면:\nUser-agent: *\nAllow: /\n\n네이버 검색로봇(Yeti)만 허용하려면:\nUser-agent: *\nDisallow: /\nUser-agent: Yeti\nAllow: /\n\n부득이하게 차단해야 하는 경우에도 IP 기반 차단은 피하세요. 검색 로봇의 IP 대역은 언제든 변경될 수 있으므로 robots.txt를 활용하는 것을 권장합니다.",
      });
    }
  }

  // ─────────────────────────────────────────
  // 진단 5: 파비콘·JS·CSS 경로 차단 감지
  // ─────────────────────────────────────────
  if (blockedSensitivePaths.length > 0) {
    details.push({
      type: "warn",
      text: `파비콘, 자바스크립트, CSS 관련 경로가 수집 차단되어 있습니다: ${blockedSensitivePaths.join(", ")}\n검색로봇이 페이지를 올바르게 해석하지 못할 수 있습니다.`,
    });
    details.push({
      type: "tip",
      text: "검색에 노출되는 페이지의 파비콘, JS, CSS 파일은 해당 페이지와 동일하게 수집을 허용하거나 기본적으로 허용하도록 설정해주세요.\n\n자세한 내용은 네이버 자바스크립트 검색 최적화 문서를 참고하세요.",
    });
  }

  return details;
}

// ─────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────

/**
 * prefetched 응답 객체를 받아 robots.txt SEO 검사 결과를 반환합니다.
 *
 * @param {{
 *   status: number|null,
 *   headers: Record<string, string>,
 *   body: string
 * }} prefetched
 *
 * @returns {{
 *   pass: boolean,
 *   statusCode: number|null,
 *   message: string,
 *   details: { type: "info"|"warn"|"tip", text: string }[]
 * }}
 */
export function checkRobotsTxt(prefetched) {
  const code = prefetched.status;

  // ── 접속 실패 ──
  if (!code) {
    return {
      pass: false,
      statusCode: null,
      message: "robots.txt에 접속할 수 없습니다",
      details: [
        {
          type: "warn",
          text: "서버에 연결할 수 없어 robots.txt를 확인하지 못했습니다. 네트워크 상태 또는 서버 설정을 확인해주세요.",
        },
      ],
    };
  }

  // ── 5xx 서버 오류 ──
  if (code >= 500) {
    return {
      pass: false,
      statusCode: code,
      message: `서버 오류 (${code}) — robots.txt에 접근할 수 없습니다`,
      details: [
        {
          type: "warn",
          text: `서버 오류 (HTTP ${code})로 robots.txt에 접근할 수 없습니다. 네이버 검색로봇은 이 경우 사이트의 모든 콘텐츠 수집을 일시적으로 중단합니다.`,
        },
        {
          type: "tip",
          text: "서버 오류가 지속되면 이전에 수집된 robots.txt 규칙이 일시적으로 적용될 수 있습니다. 빠르게 서버 상태를 복구하고 아래 예시를 참고하여 robots.txt를 정비해주세요.\n\n(예) 모든 검색엔진 허용\nUser-agent: *\nAllow: /\n\n(예) 네이버 검색로봇(Yeti)만 허용\nUser-agent: *\nDisallow: /\nUser-agent: Yeti\nAllow: /\n\n(예) 루트 페이지만 수집 허용\nUser-agent: *\nDisallow: /\nAllow: /$\n\n(예) 특정 경로 수집 비허용\nUser-agent: Yeti\nDisallow: /private*/",
        },
      ],
    };
  }

  // ── 3xx 리다이렉트 ──
  if (code >= 300 && code < 400) {
    return {
      pass: false,
      statusCode: code,
      message: `리다이렉트 감지 (${code}) — robots.txt 직접 접근 권장`,
      details: [
        {
          type: "warn",
          text: `robots.txt 접근 시 리다이렉트(HTTP ${code})가 발생하고 있습니다. 네이버 검색로봇은 HTTP 리다이렉트를 최대 5회까지만 허용하며, 이를 초과하면 모든 콘텐츠 수집을 허용한 것으로 해석합니다.`,
        },
        {
          type: "tip",
          text: "robots.txt는 리다이렉트 없이 루트 디렉터리에서 직접 접근할 수 있어야 합니다.\n또한 HTML 및 JavaScript를 통한 리다이렉트는 검색로봇이 해석하지 못하므로 반드시 HTTP 수준에서 처리해주세요.\n\n예) https://www.example.com/robots.txt",
        },
      ],
    };
  }

  // ── 4xx 클라이언트 오류 (robots.txt 없음) ──
  if (code >= 400) {
    return {
      pass: false,
      statusCode: code,
      message: `robots.txt 파일을 찾을 수 없습니다 (${code})`,
      details: [
        {
          type: "warn",
          text: "robots.txt 파일이 존재하지 않습니다. 크롤러를 제어할 수 없는 상태입니다.",
        },
        {
          type: "info",
          text: "robots.txt가 없으면 네이버 검색로봇은 사이트의 모든 콘텐츠 수집을 허용된 것으로 간주합니다. 개인정보 페이지, 관리자 페이지 등 민감한 경로가 있다면 반드시 robots.txt를 생성하세요.",
        },
        {
          type: "tip",
          text: "robots.txt 파일을 사이트의 루트 디렉터리(예: https://www.example.com/robots.txt)에 생성해주세요.\n\n(예) 모든 검색엔진 허용\nUser-agent: *\nAllow: /\n\n(예) 네이버 검색로봇(Yeti)만 허용\nUser-agent: *\nDisallow: /\nUser-agent: Yeti\nAllow: /\n\n(예) 루트 페이지만 수집 허용\nUser-agent: *\nDisallow: /\nAllow: /$\n\n(예) 특정 경로 수집 비허용\nUser-agent: Yeti\nDisallow: /private*/",
        },
      ],
    };
  }

  // ── 2xx 정상 응답 ──
  const contentType = prefetched.headers?.["content-type"] || "";
  const isPlainText = contentType.includes("text/plain");
  const details = [];

  details.push({
    type: "info",
    text: "네이버 검색로봇이 사이트에 접근해 정보를 수집할 수 있습니다.",
  });


  // 본문 파싱 진단
  const contentDetails = parseRobotsContent(prefetched.body || "");
  details.push(...contentDetails);

  return {
    pass: true,
    statusCode: code,
    message: "robots.txt 정상 확인",
    details,
  };
}
