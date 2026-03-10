import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { scoreETF, getScoreColor } from '../../utils/scoring.js'

function Change({ value }) {
  if (value === null || value === undefined) return <span className="text-slate-500 text-xs">—</span>
  const cls = value > 0 ? 'text-accent-green' : value < 0 ? 'text-accent-red' : 'text-slate-400'
  const Icon = value > 0 ? TrendingUp : TrendingDown
  return (
    <span className={`flex items-center gap-0.5 text-xs ${cls}`}>
      <Icon size={10} />
      {value > 0 ? '+' : ''}{value.toFixed(2)}%
    </span>
  )
}

export default function ETFPanel({ etfList, loading }) {
  const scored = etfList?.length ? scoreETF(etfList) : { score: null, components: {} }
  const scoreColor = getScoreColor(scored.score)

  const chartData = etfList
    ?.filter((e) => e.data?.change7d !== null && e.data?.change7d !== undefined)
    .map((e) => ({ name: e.symbol, value: e.data.change7d })) || []

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-accent-purple font-bold text-sm tracking-wider">ETF BITCOIN</span>
          <span className="text-slate-500 text-xs">20% du score</span>
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-slate-500 animate-pulse">...</span>}
          <span className="text-lg font-bold" style={{ color: scoreColor }}>
            {scored.score ?? '—'}<span className="text-xs text-slate-500">/100</span>
          </span>
        </div>
      </div>

      {/* ETF table */}
      <div className="flex flex-col gap-1.5">
        {etfList?.map((etf) => (
          <div key={etf.symbol} className="flex items-center gap-3 bg-bg-base rounded p-2 text-xs">
            <div
              className="w-1.5 h-8 rounded-full shrink-0"
              style={{ background: etf.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-200">{etf.symbol}</div>
              <div className="text-slate-500 truncate">{etf.name.split(' ').slice(0, 3).join(' ')}</div>
            </div>
            <div className="text-right">
              <div className="text-slate-200 font-mono">
                ${etf.data?.price ? etf.data.price.toFixed(2) : '—'}
              </div>
            </div>
            <div className="text-right w-20">
              <div><Change value={etf.data?.change1d} /> <span className="text-slate-600">1j</span></div>
              <div><Change value={etf.data?.change7d} /> <span className="text-slate-600">7j</span></div>
            </div>
            {etf.error && (
              <span className="text-accent-red text-xs">Erreur</span>
            )}
          </div>
        ))}

        {(!etfList || etfList.length === 0) && (
          <div className="text-slate-500 text-xs text-center py-4">
            {loading ? 'Chargement des données ETF...' : 'Données ETF indisponibles'}
          </div>
        )}
      </div>


      {/* Summary */}
      {scored.components?.etfs?.length > 0 && (
        <div className="border-t border-bg-border pt-2 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Moy. 7j :</span>
            <Change value={scored.components.avgChange7d} />
          </div>
          <div className="flex justify-between mt-0.5">
            <span>ETFs haussiers :</span>
            <span className="text-accent-green">
              {scored.components.positiveCount}/{scored.components.totalTracked}
            </span>
          </div>
        </div>
      )}

      {/* Info box about flow methodology */}
      <div className="bg-bg-base rounded p-2 text-xs text-slate-500 border border-bg-border">
        Les variations de prix servent de proxy pour les flux. Pour les flux précis (AUM),
        une source premium est requise.
      </div>
    </div>
  )
}
