import * as cheerio from "cheerio";

const KNOWN_DIRECTIVES = new Set([
  "index",
  "noindex",
  "follow",
  "nofollow",
  "all",
  "none",
  "noarchive",
  "nosnippet",
  "nosourceinfo",
  "noimageindex",
  "notranslate",
  "unavailable_after",
]);

function parseDirectives(contentValue) {
  return contentValue
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

function analyzeDirectives(directives) {
  const details = [];
  const hasNoindex = directives.includes("noindex");
  const hasNofollow = directives.includes("nofollow");
  const hasNone = directives.includes("none");
  const hasNosourceinfo = directives.includes("nosourceinfo");

  const effectiveNoindex = hasNoindex || hasNone;
  const effectiveNofollow = hasNofollow || hasNone;

  if (effectiveNoindex) {
    details.push({ type: "warn", text: "noindex: 검색 결과에서 제외됨" });
    details.push({
      type: "tip",
      text: '메인 페이지의 meta 태그에 noindex 처리가 되어있다면 해제해주세요. noindex가 표기된 페이지는 검색 반영에서 제외됩니다.\n(예외적으로 공공기관, 교육기관 등 공공재 성격의 사이트 및 사용자의 선호도가 높은 사이트는 내부 정책에 따라 검색 반영이 될 수 있습니다)\n아래 태그를 제거하세요:\n<meta name="robots" content="noindex">',
    });
  }
  if (effectiveNofollow) {
    details.push({
      type: "warn",
      text: '사이트의 메타 태그 설정에 "nofollow"가 있어 네이버 검색엔진이 사이트 내용을 검색 결과에 반영할 수 없습니다.',
    });
    details.push({
      type: "tip",
      text: '페이지의 meta 태그에 nofollow 처리가 되어있다면 해제해주세요. nofollow가 표기된 페이지의 경우 페이지 내 링크 수집을 진행하지 않습니다.\n아래 태그를 제거하세요:\n<meta name="robots" content="nofollow">',
    });
  }
  if (hasNosourceinfo) {
    details.push({
      type: "info",
      text: "nosourceinfo: AI 자동 출처 설명 미제공",
    });
  }
  for (const d of directives) {
    const base = d.split(":")[0];
    if (!KNOWN_DIRECTIVES.has(base)) {
      details.push({ type: "warn", text: `알 수 없는 지시어: "${d}"` });
    }
  }
  return { effectiveNoindex, effectiveNofollow, details };
}

export function checkRobotsMeta(html) {
  if (!html) {
    return { pass: false, found: false, message: "접속 실패", details: [] };
  }

  const $ = cheerio.load(html);
  const robotsTags = [];

  $("meta").each((_, el) => {
    const name = ($(el).attr("name") || "").toLowerCase();
    if (name === "robots" || name === "googlebot" || name === "yeti") {
      robotsTags.push({
        name: $(el).attr("name"),
        content: $(el).attr("content") || "",
      });
    }
  });

  if (robotsTags.length === 0) {
    return {
      pass: true,
      found: false,
      message: "기본값 index, follow 적용",
      details: [
        {
          type: "info",
          text: "네이버 로봇이 사이트를 수집할 수 있고 검색 결과에 노출할 수 있습니다.",
        },
      ],
    };
  }

  const details = [];
  let overallNoindex = false;
  let overallNofollow = false;

  for (const tag of robotsTags) {
    const directives = parseDirectives(tag.content);
    const {
      effectiveNoindex,
      effectiveNofollow,
      details: tagDetails,
    } = analyzeDirectives(directives);
    details.push(...tagDetails);
    if (effectiveNoindex) overallNoindex = true;
    if (effectiveNofollow) overallNofollow = true;
  }

  const pass = !overallNoindex && !overallNofollow;
  const statusParts = [];
  if (overallNoindex) statusParts.push("noindex");
  if (overallNofollow) statusParts.push("nofollow");

  if (pass) {
    details.unshift({
      type: "info",
      text: "네이버 로봇이 사이트를 수집할 수 있고 검색 결과에 노출할 수 있습니다.",
    });
  }

  const message = pass
    ? `로봇 메타 태그 있음 - 색인 허용${overallNofollow ? " (링크 미수집)" : ""}`
    : `로봇 메타 태그 있음 - 색인 제외 (${statusParts.join(", ")})`;

  return { pass, found: true, message, details };
}
