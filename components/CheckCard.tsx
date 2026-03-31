'use client';

import { useState } from 'react';

interface Detail {
  type: 'info' | 'warn' | 'tip';
  text: string;
}

interface Check {
  name: string;
  key: string;
  pass: boolean;
  warn?: boolean;
  message: string;
  details?: Detail[];
}

interface Props {
  check: Check;
  guide?: string;
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function CheckCard({ check, guide }: Props) {
  const [open, setOpen] = useState(false);

  const status = check.warn ? 'warn' : check.pass ? 'pass' : 'fail';
  const borderColor =
    status === 'pass'
      ? 'border-l-green-500'
      : status === 'warn'
        ? 'border-l-amber-500'
        : 'border-l-red-500';
  const statusIcon = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';

  const hasDetails = check.details && check.details.length > 0;
  const showGuide = !hasDetails && !check.pass && guide;

  return (
    <div className={`bg-white rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.07)] border-l-[5px] ${borderColor}`}>
      <div
        className="flex items-center gap-[10px] px-[18px] py-[14px] cursor-pointer select-none hover:bg-slate-50"
        onClick={() => setOpen(!open)}
      >
        <span className="text-[1.1rem] shrink-0">{statusIcon}</span>
        <span className="font-semibold text-[0.95rem] flex-1">{check.name}</span>
        <span className="text-[0.82rem] text-slate-500">{check.message}</span>
        <span
          className={`text-[0.75rem] text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </div>

      {open && (
        <div className="px-[18px] pb-[14px] border-t border-slate-100">
          {hasDetails &&
            check.details!.map((d, i) => {
              if (d.type === 'tip') {
                return (
                  <div
                    key={i}
                    className="flex gap-2 bg-blue-50 rounded-md px-[10px] py-[7px] mt-[2px] text-blue-700 text-[0.81rem] leading-relaxed"
                  >
                    <span className="shrink-0 text-blue-500">💡</span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: escapeHtml(d.text).replace(/\n/g, '<br>'),
                      }}
                    />
                  </div>
                );
              }
              const icon = d.type === 'warn' ? '❗' : 'ℹ️';
              return (
                <div
                  key={i}
                  className="flex gap-2 py-[6px] text-[0.83rem] leading-relaxed border-b border-slate-50 last:border-b-0"
                >
                  <span className="shrink-0 mt-px">{icon}</span>
                  <span>{d.text}</span>
                </div>
              );
            })}

          {showGuide && (
            <div className="flex gap-2 bg-blue-50 rounded-md px-[10px] py-[7px] mt-[2px] text-blue-700 text-[0.81rem] leading-relaxed">
              <span className="shrink-0 text-blue-500">💡</span>
              <span
                dangerouslySetInnerHTML={{
                  __html: escapeHtml(guide).replace(/\n/g, '<br>'),
                }}
              />
            </div>
          )}

          {!hasDetails && check.pass && (
            <div className="flex gap-2 py-[6px] text-[0.83rem] leading-relaxed">
              <span className="shrink-0 mt-px">ℹ️</span>
              <span>이상 없음</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
