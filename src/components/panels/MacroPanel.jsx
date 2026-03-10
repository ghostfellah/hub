import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { scoreMacro, getScoreColor } from '../../utils/scoring.js'

function Trend({ trend }) {
  if (!trend) return <span className="text-slate-500">—</span>
  if (trend === 'rising') return <TrendingUp size={12} className="text-accent-red inline" />
  if (trend === 'falling') return <TrendingDown size={12} className="text-accent-green inline" />
  return <Minus size={12} className="text-slate-400 inline" />
}

function MetricRow({ label, value, unit = '', trend, invertTrend = false, extra }) {
  const trendPositive = invertTrend ? trend === 'falling' : trend === 'rising'
  const valueColor = trend === 'falling'
    ? (invertTrend ? 'text-accent-red' : 'text-accent-green')
    : trend === 'rising'
      ? (invertTrend ? 'text-accent-green' : 'text-accent-red')
      : 'text-slate-200'

  return (
    <div className="flex items-center justify-between bg-bg-base rounded p-2 text-xs">
      <div className="text-slate-400 w-28 shrink-0">{label}</div>
      <div className={`font-mono font-semibold ${valueColor}`}>
        {value !== null && value !== undefined ? `${Number(value).toFixed(2)}${unit}` : '—'}
      </div>
      <div className="flex items-center gap-1 w-24 justify-end">
        <Trend trend={trend} />
        {extra && <span className="text-slate-500">{extra}</span>}
      </div>
    </div>
  )
}

export default function MacroPanel({ macroData, macroAssets, loading }) {
  const scored = scoreMacro(macroData, macroAssets)
  const scoreColor = getScoreColor(scored.score)
  const hasFreqKey = !macroData?.error

  // Yield curve sparkline from history
  const yieldSparkline = macroData?.yield10y?.history?.map((h, i) => ({
    i,
    y10: h.value,
    y2: macroData?.yield2y?.history?.[i]?.value ?? null,
  })) || []

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-accent-green font-bold text-sm tracking-wider">MACROÉCONOMIE</span>
          <span className="text-slate-500 text-xs">30% du score</span>
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-slate-500 animate-pulse">...</span>}
          <span className="text-lg font-bold" style={{ color: scoreColor }}>
            {scored.score ?? '—'}<span className="text-xs text-slate-500">/100</span>
          </span>
        </div>
      </div>

      {/* FRED key warning */}
      {macroData?.error && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded p-2 text-xs text-yellow-400">
          {macroData.error}
        </div>
      )}

      {/* Fed Rate + CPI */}
      <div className="flex flex-col gap-1.5">
        <div className="text-xs text-slate-500 mb-0.5">Politique monétaire (FRED)</div>
        <MetricRow
          label="Fed Funds Rate"
          value={macroData?.fedFunds?.current}
          unit="%"
          trend={macroData?.fedFunds?.trend}
          invertTrend={true}
          extra="→ BTC"
        />
        <MetricRow
          label="Inflation (CPI YoY)"
          value={macroData?.cpi?.yoY}
          unit="%"
          trend={macroData?.cpi?.trend}
          invertTrend={true}
        />
        <MetricRow
          label="Chômage"
          value={macroData?.unemployment?.current}
          unit="%"
          trend={macroData?.unemployment?.trend}
          invertTrend={true}
        />
      </div>

      {/* Net Liquidity */}
      <div className="flex flex-col gap-1.5">
        <div className="text-xs text-slate-500 mb-0.5">Liquidité nette (Fed BS − TGA − RRP)</div>
        <div className="bg-bg-base rounded p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">Net Liquidity</div>
            <div className="flex items-center gap-2">
              {macroData?.netLiquidity ? (
                <>
                  <span className="font-mono font-bold text-lg text-slate-100">
                    ${macroData.netLiquidity.currentT}T
                  </span>
                  <span className={`flex items-center gap-0.5 text-xs ${macroData.netLiquidity.trend === 'rising' ? 'text-accent-green'
                      : macroData.netLiquidity.trend === 'falling' ? 'text-accent-red'
                        : 'text-slate-400'
                    }`}>
                    {macroData.netLiquidity.trend === 'rising' ? <TrendingUp size={12} /> : macroData.netLiquidity.trend === 'falling' ? <TrendingDown size={12} /> : <Minus size={12} />}
                    {macroData.netLiquidity.changePercent > 0 ? '+' : ''}{macroData.netLiquidity.changePercent}%
                  </span>
                </>
              ) : (
                <span className="text-slate-500 text-sm">—</span>
              )}
            </div>
          </div>
          {macroData?.netLiquidity?.components && (
            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
              <div>
                <div className="text-slate-600">Fed BS</div>
                <div className="font-mono text-slate-400">${(macroData.netLiquidity.components.fedBS / 1_000_000).toFixed(2)}T</div>
              </div>
              <div>
                <div className="text-slate-600">TGA</div>
                <div className="font-mono text-accent-red">${(macroData.netLiquidity.components.tga / 1_000_000).toFixed(2)}T</div>
              </div>
              <div>
                <div className="text-slate-600">RRP</div>
                <div className="font-mono text-accent-red">${(macroData.netLiquidity.components.rrp / 1_000).toFixed(2)}T</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Yield curve */}
      <div className="flex flex-col gap-1.5">
        <div className="text-xs text-slate-500 mb-0.5">Courbe des taux</div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-bg-base rounded p-2 text-xs">
            <div className="text-slate-500">Taux 10Y</div>
            <div className="font-mono font-semibold text-slate-200 mt-0.5">
              {macroData?.yield10y?.current ? `${macroData.yield10y.current.toFixed(2)}%` : '—'}
            </div>
          </div>
          <div className="bg-bg-base rounded p-2 text-xs">
            <div className="text-slate-500">Taux 2Y</div>
            <div className="font-mono font-semibold text-slate-200 mt-0.5">
              {macroData?.yield2y?.current ? `${macroData.yield2y.current.toFixed(2)}%` : '—'}
            </div>
          </div>
          <div className="bg-bg-base rounded p-2 text-xs">
            <div className="text-slate-500">Spread</div>
            <div className={`font-mono font-semibold mt-0.5 ${macroData?.yieldSpread > 0 ? 'text-accent-green' : 'text-accent-red'
              }`}>
              {macroData?.yieldSpread ? `${Number(macroData.yieldSpread) > 0 ? '+' : ''}${macroData.yieldSpread}%` : '—'}
            </div>
            <div className="text-xs text-slate-600">
              {macroData?.yieldSpread < 0 ? 'Inversée ⚠' : 'Normale'}
            </div>
          </div>
        </div>
      </div>

      {/* Market assets */}
      <div className="flex flex-col gap-1.5">
        <div className="text-xs text-slate-500 mb-0.5">Actifs de marché</div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'S&P 500 (SPY)', data: macroAssets?.spy, color: '#3b82f6' },
            { label: 'Dollar (UUP)', data: macroAssets?.uup, color: '#f59e0b', invert: true },
            { label: 'Gold (GLD)', data: macroAssets?.gld, color: '#fbbf24' },
          ].map(({ label, data, color, invert }) => (
            <div key={label} className="bg-bg-base rounded p-2 text-xs">
              <div className="text-slate-500 truncate">{label}</div>
              <div className="font-mono font-semibold text-slate-200 mt-0.5">
                ${data?.price ? data.price.toFixed(2) : '—'}
              </div>
              <div className={`text-xs ${data?.change7d > 0 ? (invert ? 'text-accent-red' : 'text-accent-green')
                  : data?.change7d < 0 ? (invert ? 'text-accent-green' : 'text-accent-red')
                    : 'text-slate-400'
                }`}>
                {data?.change7d ? `${data.change7d > 0 ? '+' : ''}${data.change7d.toFixed(2)}% 7j` : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score components */}
      <div className="border-t border-bg-border pt-2 text-xs text-slate-500">
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <div className="flex justify-between">
            <span>Fed rate:</span>
            <span className={macroData?.fedFunds?.trend === 'falling' ? 'text-accent-green' : macroData?.fedFunds?.trend === 'rising' ? 'text-accent-red' : 'text-slate-400'}>
              {macroData?.fedFunds?.trend ?? '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Inflation:</span>
            <span className={macroData?.cpi?.trend === 'falling' ? 'text-accent-green' : macroData?.cpi?.trend === 'rising' ? 'text-accent-red' : 'text-slate-400'}>
              {macroData?.cpi?.trend ?? '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Dollar 7j:</span>
            <span className={macroAssets?.uup?.change7d < 0 ? 'text-accent-green' : macroAssets?.uup?.change7d > 0 ? 'text-accent-red' : 'text-slate-400'}>
              {macroAssets?.uup?.change7d !== undefined ? `${macroAssets.uup.change7d > 0 ? '+' : ''}${macroAssets.uup.change7d?.toFixed(2)}%` : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>SPY 7j:</span>
            <span className={macroAssets?.spy?.change7d > 0 ? 'text-accent-green' : macroAssets?.spy?.change7d < 0 ? 'text-accent-red' : 'text-slate-400'}>
              {macroAssets?.spy?.change7d !== undefined ? `${macroAssets.spy.change7d > 0 ? '+' : ''}${macroAssets.spy.change7d?.toFixed(2)}%` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
