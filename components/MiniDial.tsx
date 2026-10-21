export default function MiniDial({ score, size = 30 }: { score: number; size?: number }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  const color = score >= 80 ? 'var(--teal)' : score >= 55 ? 'var(--brass)' : 'var(--rust)';
  return (
    <svg className="dial" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-alt)" strokeWidth="3" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fontFamily="IBM Plex Mono" fontSize={size * 0.3} fill={color} fontWeight="600">
        {score}
      </text>
    </svg>
  );
}