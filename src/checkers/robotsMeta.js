import axios from "axios";
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
  const hasNone = directives.includes("none"); // none = noindex,nofollow
  const hasIndex = directives.includes("index");
  const hasFollow = directives.includes("follow");
  const hasAll = directives.includes("all"); // all = index,follow
  const hasNosourceinfo = directives.includes("nosourceinfo");

  const effectiveNoindex = hasNoindex || hasNone;
  const effectiveNofollow = hasNofollow || hasNone;

  if (effectiveNoindex) {
    details.push({ type: "warn", text: "noindex: 검색 결과에서 제외됨" });
  } else if (hasIndex || hasAll) {
    details.push({ type: "info", text: "index: 검색 색인 대상" });
  }

  if (effectiveNofollow) {
    details.push({ type: "warn", text: "nofollow: 페이지 내 링크 미수집" });
  } else if (hasFollow || hasAll) {
    details.push({ type: "info", text: "follow: 페이지 내 링크 수집" });
  }

  if (hasNosourceinfo) {
    details.push({
      type: "info",
      text: "nosourceinfo: AI 자동 출처 설명 미제공",
    });
  }

  // 알 수 없는 지시어 경고
  for (const d of directives) {
    const base = d.split(":")[0]; // unavailable_after:DATE 형식 처리
    if (!KNOWN_DIRECTIVES.has(base)) {
      details.push({ type: "warn", text: `알 수 없는 지시어: "${d}"` });
    }
  }

  return { effectiveNoindex, effectiveNofollow, details };
}

export async function checkRobotsMeta(url) {
  try {
    const response = await axios.get(url, {
      maxRedirects: 5,
      timeout: 10000,
      validateStatus: () => true,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SEOChecker/1.0)" },
    });

    const contentType = response.headers["content-type"] || "";
    if (!contentType.includes("text/html")) {
      return {
        pass: true,
        found: false,
        message: `HTML 문서가 아님 (${contentType || "없음"}) - 메타 태그 검사 건너뜀`,
        details: [],
      };
    }

    const $ = cheerio.load(response.data);
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
  } catch (error) {
    return {
      pass: false,
      found: false,
      message: `접속 실패 - ${error.message}`,
      details: [],
    };
  }
}
