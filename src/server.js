import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkHttpStatus } from './checkers/httpStatus.js';
import { checkRobotsTxt } from './checkers/robotsTxt.js';
import { checkRobotsMeta } from './checkers/robotsMeta.js';
import { checkTitleTag } from './checkers/titleTag.js';
import { checkMetaDescription } from './checkers/metaDescription.js';
import { checkOgTitle } from './checkers/ogTitle.js';
import { checkOgDescription } from './checkers/ogDescription.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, '../public')));

function normalizeUrl(input) {
  if (/^https?:\/\//i.test(input)) return input;
  return `https://${input}`;
}

app.get('/check', async (req, res) => {
  const input = req.query.url;
  if (!input) return res.status(400).json({ error: 'URL이 필요합니다.' });

  const url = normalizeUrl(input);

  try {
    const [http, robots, robotsMeta, title, desc, ogTitle, ogDesc] = await Promise.all([
      checkHttpStatus(url),
      checkRobotsTxt(url),
      checkRobotsMeta(url),
      checkTitleTag(url),
      checkMetaDescription(url),
      checkOgTitle(url),
      checkOgDescription(url),
    ]);

    res.json({
      url,
      checks: [
        { name: 'HTTP 상태코드',               key: 'http',      ...http },
        { name: 'robots.txt',                  key: 'robots',    ...robots },
        { name: '로봇 메타 태그',               key: 'robotsMeta',...robotsMeta },
        { name: '페이지 제목 (title)',          key: 'title',     ...title },
        { name: '사이트 설명 (meta description)',key: 'desc',      ...desc },
        { name: 'Open Graph 제목 (og:title)',   key: 'ogTitle',   ...ogTitle },
        { name: 'Open Graph 설명 (og:description)', key: 'ogDesc',...ogDesc },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`SEO Checker 서버 실행 중 → http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`포트 ${PORT} 이미 사용 중. PORT 환경변수로 다른 포트를 지정하세요. 예: PORT=3001 npm run server`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
