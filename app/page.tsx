'use client';

import { useState } from 'react';
import SearchBar from '@/components/SearchBar';
import ResultHeader from '@/components/ResultHeader';
import CheckCard from '@/components/CheckCard';
import Loader from '@/components/Loader';

interface Detail {
  type: 'info' | 'warn' | 'tip';
  text: string;
}

interface CheckResult {
  name: string;
  key: string;
  pass: boolean;
  warn?: boolean;
  message: string;
  details?: Detail[];
}

interface SeoResult {
  url: string;
  checks: CheckResult[];
}

const GUIDES: Record<string, string> = {
  http: '서버 접속에 실패했습니다. URL이 올바른지, 서버가 정상 동작 중인지 확인하세요.\n\n웹 서버 혹은 방화벽에서 네이버 검색로봇(Yeti)의 접근을 차단하고 있는지 확인해주세요.\n사이트의 메인 페이지가 자바스크립트 혹은 meta refresh 기법을 사용하여 redirect 된다면 검색엔진이 올바르게 인식하지 못할 수 있습니다. HTTP redirect 방식을 사용해주세요.',
  robots:
    'robots.txt 파일에 작성된 규칙은 같은 호스트, 프로토콜 및 포트 번호 하위의 페이지에 대해서만 유효합니다.\n\n(예) 네이버 검색로봇만 수집 허용\nUser-agent: *\nDisallow: /\nUser-agent: Yeti\nAllow: /\n\n(예) 모든 검색엔진의 로봇에 대하여 수집 허용\nUser-agent: *\nAllow: /\n\n부득이하게 검색 로봇을 차단해야 하는 경우 IP 기반으로 차단하지 마세요. 검색 로봇의 IP 대역은 언제든지 변경될 수 있습니다. robots.txt를 활용하는 것을 권장합니다.\n또한 웹마스터도구에 사이트맵(XML)과 RSS를 제출하면 콘텐츠가 더 빠르게 검색에 반영됩니다.',
  robotsMeta:
    '페이지의 meta 태그에 noindex 또는 nofollow 처리가 되어있다면 해제해주세요.\n아래 태그를 제거하세요:\n<meta name="robots" content="noindex">\n<meta name="robots" content="nofollow">\n\n페이지 내 콘텐츠가 자바스크립트로만 로딩되는 구조라면 검색엔진이 콘텐츠를 인식하지 못할 수 있습니다. 표준 HTML 마크업을 사용하세요.\n또한, 중요한 콘텐츠를 HTML frame 태그로 감싸고 있다면 일반 HTML 태그로 변경하세요.',
  title:
    '페이지에 접속할 수 없어 title 태그를 확인하지 못했습니다. <head> 안에 <title>페이지 제목</title>을 추가하세요.\n\n모든 페이지의 제목을 동일하게 표현하지 마세요. 페이지의 제목은 콘텐츠 주제를 정확하게 설명할 수 있는 고유한 문구를 사용해야 합니다.\n사이트 제목과 설명은 검색엔진에서 엄격하게 관리하고 있으므로 정책에 위반되는 항목이 없는지 확인하세요.',
  desc: '페이지에 접속할 수 없어 meta description을 확인하지 못했습니다. <meta name="description" content="페이지 설명">을 추가하세요.\n\n제목(title)과 설명을 동일하게 작성하지 마세요. 각 페이지의 콘텐츠 주제를 정확하게 요약한 고유한 설명을 사용하세요.',
  ogTitle:
    '페이지에 접속할 수 없어 og:title을 확인하지 못했습니다. <meta property="og:title" content="제목">을 추가하세요.\n\n네이버 블로그, 카페, 페이스북, 인스타그램 등 소셜 미디어에서 공유될 때 올바른 제목이 표시되도록 Open Graph 태그를 설정하세요. 사이트 연관 채널 정보를 함께 마크업하면 온라인 브랜딩에 도움이 됩니다.',
  ogDesc:
    '페이지에 접속할 수 없어 og:description을 확인하지 못했습니다. <meta property="og:description" content="설명">을 추가하세요.\n\n소셜 미디어에서 공유될 때 올바른 설명이 표시되도록 Open Graph 태그를 설정하세요. 사이트 연관 채널 정보를 함께 마크업하면 온라인 브랜딩에 도움이 됩니다.',
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SeoResult | null>(null);

  async function handleCheck(url: string) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/check?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '서버 오류');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[760px] mx-auto px-4 py-10">
      <header className="text-center mb-9">
        <h1 className="text-3xl font-extrabold tracking-tight">
          SEO <span className="text-indigo-500">Checker</span>
        </h1>
        <p className="mt-2 text-slate-500 text-[0.95rem]">
          URL을 입력하면 주요 SEO 항목을 자동으로 분석합니다.
        </p>
      </header>

      <SearchBar onSubmit={handleCheck} disabled={loading} />

      {loading && <Loader />}

      {error && (
        <div className="bg-red-100 text-red-700 rounded-xl px-[18px] py-[14px] text-[0.9rem]">
          오류: {error}
        </div>
      )}

      {result && (
        <div>
          <ResultHeader url={result.url} checks={result.checks} />
          <div className="flex flex-col gap-3">
            {result.checks.map((check) => (
              <CheckCard key={check.key} check={check} guide={GUIDES[check.key]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
