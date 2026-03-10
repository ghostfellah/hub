import { getScoreColor, getSignal } from '../utils/scoring.js'

const RADIUS = 80
const STROKE = 14
const CIRCUM = Math.PI * RADIUS // half-circle

export default function ScoreGauge({ score, label, size = 220 }) {
  const signal = getSignal(score)
  const color = getScoreColor(score)
  const pct = score !== null ? score / 100 : 0
  const dashOffset = CIRCUM * (1 - pct)
  const cx = size / 2
  const cy = size / 2 + 15

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
        {/* Background arc */}
        <path
          d={`M ${cx - RADIUS} ${cy} A ${RADIUS} ${RADIUS} 0 0 1 ${cx + RADIUS} ${cy}`}
          fill="none"
          stroke="#1a2540"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d={`M ${cx - RADIUS} ${cy} A ${RADIUS} ${RADIUS} 0 0 1 ${cx + RADIUS} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUM}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s' }}
          filter={`drop-shadow(0 0 6px ${color})`}
        />

        {/* Zone labels */}
        <text x={cx - RADIUS - 4} y={cy + 20} fill="#ef4444" fontSize="9" textAnchor="middle">VENTE</text>
        <text x={cx + RADIUS + 4} y={cy + 20} fill="#22c55e" fontSize="9" textAnchor="middle">ACHAT</text>

        {/* Score number */}
        <text x={cx} y={cy - 10} textAnchor="middle" fill={color} fontSize="42" fontWeight="700" fontFamily="JetBrains Mono">
          {score !== null ? score : '—'}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono">
          /100
        </text>
      </svg>

      <div
        className="text-center px-4 py-1 rounded text-sm font-bold tracking-widest"
        style={{ color, borderColor: color, border: `1px solid ${color}`, background: `${color}18` }}
      >
        {signal.emoji} {signal.label}
      </div>
      {label && <div className="text-xs text-slate-400 text-center">{label}</div>}
    </div>
  )
}
