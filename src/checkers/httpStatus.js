import axios from "axios";

const STATUS_MESSAGES = {
  200: "정상 접속 - 요청된 웹 페이지를 정상적으로 응답",
  301: "영구 이동 - URL이 완전히 전환됨",
  302: "임시 이동",
  303: "임시 이동 (See Other)",
  307: "임시 리다이렉트",
  308: "영구 리다이렉트",
  400: "잘못된 요청 - HTTP 문법 오류",
  401: "인증 필요 - 접근 자격 없음",
  403: "접근 금지 - 권한 없음",
  404: "페이지 없음 - 존재하지 않는 페이지",
  500: "서버 오류 - 서버 설정/프로그램 오류",
  503: "서비스 불가 - 서버 과부하",
};

function getStatusMessage(code) {
  if (STATUS_MESSAGES[code]) return STATUS_MESSAGES[code];
  if (code >= 400 && code < 500) return "클라이언트 오류";
  if (code >= 500) return "서버 오류";
  return "알 수 없는 응답";
}

export async function checkHttpStatus(url) {
  try {
    const response = await axios.get(url, {
      maxRedirects: 0,
      timeout: 10000,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
    });

    const code = response.status;
    const location = response.headers["location"] || null;
    const cfMitigated = response.headers["cf-mitigated"] || "";
    const server = response.headers["server"] || "";
    const isCloudflareChallenged = cfMitigated.includes("challenge") || (code === 403 && server.toLowerCase() === "cloudflare");

    const message = isCloudflareChallenged
      ? "Cloudflare 보안 챌린지 감지 - 실제 서버 응답 아님"
      : getStatusMessage(code);
    const pass = isCloudflareChallenged ? true : code >= 200 && code < 400;

    const details = [];
    if (isCloudflareChallenged) {
      details.push({
        type: "info",
        text: `HTTP ${code} - Cloudflare 보안 챌린지 (봇 방어)`,
      });
      details.push({
        type: "info",
        text: "Cloudflare가 자동화된 요청을 차단하고 있습니다. 실제 검색엔진 봇(Googlebot, Yeti 등)은 Cloudflare에서 별도로 허용되므로 SEO에는 영향이 없습니다.",
      });
    } else if (code >= 200 && code < 300) {
      details.push({
        type: "info",
        text: `HTTP ${code} - ${message}`,
      });
    } else if (code >= 300 && code < 400) {
      details.push({
        type: "info",
        text: `HTTP ${code} - ${message}`,
      });
    } else {
      details.push({
        type: "warn",
        text: `HTTP ${code} - ${message}`,
      });
    }
    if (location) {
      details.push({ type: "info", text: `리다이렉트 대상: ${location}` });
    }
    if (code >= 300 && code < 400) {
      details.push({
        type: "tip",
        text: "301(영구 이동)은 SEO에 유리합니다. 302~307은 임시 이동으로, 검색엔진이 원본 URL을 유지합니다. 영구적으로 이전한 경우 301을 사용하세요.",
      });
    }
    if (code >= 400 && !isCloudflareChallenged) {
      details.push({
        type: "tip",
        text: `${code >= 500 ? "서버 오류를 확인하고 수정하세요." : "URL이 올바른지, 페이지가 존재하는지 확인하세요."} 오류 페이지는 검색 색인에서 제외됩니다.`,
      });
    }

    return { code, message, pass, location, details };
  } catch (error) {
    return {
      code: null,
      message: `접속 실패 - ${error.message}`,
      pass: false,
      location: null,
    };
  }
}
