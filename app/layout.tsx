import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SEO Checker',
  description: 'URL을 입력하면 주요 SEO 항목을 자동으로 분석합니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-[#f0f4f8] text-slate-800 min-h-screen font-[Segoe_UI,system-ui,sans-serif]">
        {children}
      </body>
    </html>
  );
}
