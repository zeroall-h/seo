interface Check {
  pass: boolean;
}

interface Props {
  url: string;
  checks: Check[];
}

export default function ResultHeader({ url, checks }: Props) {
  const passCount = checks.filter((c) => c.pass).length;
  const total = checks.length;

  const badgeClass =
    passCount === total
      ? 'bg-green-100 text-green-600'
      : passCount >= total / 2
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-red-100 text-red-600';

  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <div className="text-[0.82rem] text-slate-500 break-all">{url}</div>
      <div className={`text-[0.9rem] font-bold px-[14px] py-1 rounded-full ${badgeClass}`}>
        {passCount} / {total} 통과
      </div>
    </div>
  );
}
