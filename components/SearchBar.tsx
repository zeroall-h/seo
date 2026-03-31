'use client';

import { useState } from 'react';

interface Props {
  onSubmit: (url: string) => void;
  disabled: boolean;
}

export default function SearchBar({ onSubmit, disabled }: Props) {
  const [url, setUrl] = useState('');

  function handleSubmit() {
    const trimmed = url.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <div className="flex gap-2 bg-white rounded-[14px] px-3 py-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] mb-8">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="https://example.com"
        className="flex-1 border-none outline-none text-base text-slate-800 bg-transparent placeholder:text-slate-400"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="bg-indigo-500 text-white border-none rounded-[9px] px-[22px] py-[10px] text-[0.95rem] font-semibold cursor-pointer transition-colors whitespace-nowrap hover:bg-indigo-600 disabled:bg-indigo-300 disabled:cursor-not-allowed"
      >
        검사 시작
      </button>
    </div>
  );
}
