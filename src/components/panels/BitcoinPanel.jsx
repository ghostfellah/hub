import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Minus, Cpu, Zap, Activity } from 'lucide-react'
import { scoreBTC, getScoreColor } from '../../utils/scoring.js'

function fmt(n, decimals = 0) {
  if (n === null || n === undefined) return '—'
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: decimals })
}

function fmtUSD(n) {
  if (n === null || n === undefined) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  return `$${fmt(n)}`
}

function Change({ value, suffix = '%', invert = false }) {
  if (value === null || value === undefined) return <span className="text-slate-500">—</span>
  const positive = invert ? value < 0 : value > 0
  const cls = positive ? 'text-accent-green' : value === 0 ? 'text-slate-400' : 'text-accent-red'
  const Icon = positive ? TrendingUp : value === 0 ? Minus : TrendingDown
  return (
    <span className={`flex items-center gap-0.5 ${cls}`}>
      <Icon size={11} />
      {value > 0 ? '+' : ''}{Number(value).toFixed(2)}{suffix}
    </span>
  )
}

function MiniGauge({ label, score }) {
  const color = getScoreColor(score)
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400 text-xs w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-bg-base rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${score ?? 0}%`, background: color }}
        />
      </div>
      <span className="text-xs w-8 text-right" style={{ color }}>{score ?? '—'}</span>
    </div>
  )
}

export default function BitcoinPanel({ btcData, loading }) {
  const { market, history, fearGreed, hashrate, onChain } = btcData || {}
  const scored = btcData ? scoreBTC(btcData) : { score: null, components: {} }
  const scoreColor = getScoreColor(scored.score)

  const fgColor = fearGreed?.current?.value < 25 ? 'accent-green'
    : fearGreed?.current?.value > 75 ? 'accent-red' : 'accent-amber'

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-accent-amber font-bold text-sm tracking-wider">₿ BITCOIN</span>
          <span className="text-slate-500 text-xs">40% du score</span>
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-slate-500 animate-pulse">...</span>}
          <span
            className="text-lg font-bold"
            style={{ color: scoreColor }}
          >
            {scored.score ?? '—'}<span className="text-xs text-slate-500">/100</span>
          </span>
        </div>
      </div>

      {/* Price + sparkline */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-bold text-white">
            ${market?.price ? fmt(market.price) : '—'}
          </div>
          <div className="flex gap-3 mt-1 text-xs">
            <div className="flex flex-col">
              <span className="text-slate-500">24h</span>
              <Change value={market?.change24h} />
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">7j</span>
              <Change value={market?.change7d} />
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">30j</span>
              <Change value={market?.change30d} />
            </div>
          </div>
        </div>
        <div className="flex-1 h-16">
          {history?.sparkline?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history.sparkline} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="btcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={1.5} fill="url(#btcGrad)" dot={false} />
                <Tooltip
                  contentStyle={{ background: '#0d1225', border: '1px solid #1a2540', borderRadius: 4, fontSize: 10 }}
                  formatter={(v) => [`$${fmt(v)}`, 'Prix']}
                  labelFormatter={() => ''}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-600 text-xs">
              {loading ? 'Chargement...' : 'Pas de données'}
            </div>
          )}
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-bg-base rounded p-2">
          <div className="text-slate-500 mb-0.5">MA200</div>
          <div className={history?.ma200 && market?.price > history?.ma200 ? 'text-accent-green font-semibold' : 'text-accent-red font-semibold'}>
            ${history?.ma200 ? fmt(history.ma200) : '—'}
          </div>
          <div className={`text-xs ${scored.components.priceVsMA200 > 1 ? 'text-accent-green' : 'text-accent-red'}`}>
            {scored.components.priceVsMA200 ? `×${scored.components.priceVsMA200}` : '—'}
          </div>
        </div>

        <div className="bg-bg-base rounded p-2">
          <div className="text-slate-500 mb-0.5">RSI 14</div>
          <div className={
            scored.components.rsi14 < 30 ? 'text-accent-green font-semibold' :
              scored.components.rsi14 > 70 ? 'text-accent-red font-semibold' : 'text-slate-200 font-semibold'
          }>
            {scored.components.rsi14 ?? '—'}
          </div>
          <div className="text-slate-500">
            {scored.components.rsi14 < 30 ? 'Survendu' : scored.components.rsi14 > 70 ? 'Suracheté' : 'Neutre'}
          </div>
        </div>

        <div className="bg-bg-base rounded p-2">
          <div className="text-slate-500 mb-0.5">Fear & Greed</div>
          <div className={`font-semibold text-${fgColor}`}>
            {fearGreed?.current?.value ?? '—'}
          </div>
          <div className={`text-xs text-${fgColor}`}>
            {fearGreed?.current?.label ?? '—'}
          </div>
        </div>

        <div className="bg-bg-base rounded p-2">
          <div className="text-slate-500 mb-0.5 flex items-center gap-1">
            <Cpu size={10} /> Hashrate
          </div>
          <div className="font-semibold text-slate-200">
            {hashrate?.current ? `${hashrate.current.toFixed(0)} EH/s` : '—'}
          </div>
          <div>
            <Change value={hashrate?.change7d} suffix="% 7j" />
          </div>
        </div>
      </div>

      {/* Volume & market cap */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-bg-base rounded p-2">
          <div className="text-slate-500 mb-0.5">Volume 24h</div>
          <div className="text-slate-200 font-semibold">{fmtUSD(market?.volume24h)}</div>
          <div className="text-slate-500">
            {scored.components.volumeRatio ? `×${scored.components.volumeRatio} vs moy 30j` : ''}
          </div>
        </div>
        <div className="bg-bg-base rounded p-2">
          <div className="text-slate-500 mb-0.5">Market Cap</div>
          <div className="text-slate-200 font-semibold">{fmtUSD(market?.marketCap)}</div>
          <div className="text-slate-500">
            {market?.ath ? `ATH: ${fmtUSD(market.ath)}` : ''}
          </div>
        </div>
      </div>

      {/* On-Chain Metrics */}
      <div className="border-t border-bg-border pt-2">
        <div className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
          <Activity size={10} /> On-Chain (bitcoin-data.com)
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-bg-base rounded p-2">
            <div className="text-slate-500 mb-0.5">MVRV Z-Score</div>
            <div className={`font-semibold ${onChain?.mvrvZscore == null ? 'text-slate-500'
                : onChain.mvrvZscore < 0 ? 'text-accent-green'
                  : onChain.mvrvZscore < 2.5 ? 'text-slate-200'
                    : onChain.mvrvZscore < 4 ? 'text-accent-amber'
                      : 'text-accent-red'
              }`}>
              {onChain?.mvrvZscore != null ? onChain.mvrvZscore.toFixed(2) : '—'}
            </div>
            <div className="text-slate-500">
              {onChain?.mvrvZscore == null ? '' : onChain.mvrvZscore < 0 ? 'Sous-évalué' : onChain.mvrvZscore < 2.5 ? 'Neutre' : onChain.mvrvZscore < 4 ? 'Élevé' : 'Bulle'}
            </div>
          </div>

          <div className="bg-bg-base rounded p-2">
            <div className="text-slate-500 mb-0.5">LTH NUPL</div>
            <div className={`font-semibold ${onChain?.nuplLth == null ? 'text-slate-500'
                : onChain.nuplLth < 0 ? 'text-accent-green'
                  : onChain.nuplLth < 0.5 ? 'text-slate-200'
                    : onChain.nuplLth < 0.75 ? 'text-accent-amber'
                      : 'text-accent-red'
              }`}>
              {onChain?.nuplLth != null ? onChain.nuplLth.toFixed(3) : '—'}
            </div>
            <div className="text-slate-500">
              {onChain?.nuplLth == null ? '' : onChain.nuplLth < 0 ? 'Capitulation' : onChain.nuplLth < 0.25 ? 'Espoir' : onChain.nuplLth < 0.5 ? 'Optimisme' : onChain.nuplLth < 0.75 ? 'Croyance' : 'Euphorie'}
            </div>
          </div>

          <div className="bg-bg-base rounded p-2">
            <div className="text-slate-500 mb-0.5">LTH SOPR</div>
            <div className={`font-semibold ${onChain?.lthSopr == null ? 'text-slate-500'
                : onChain.lthSopr < 1 ? 'text-accent-green'
                  : onChain.lthSopr < 1.05 ? 'text-slate-200'
                    : 'text-accent-amber'
              }`}>
              {onChain?.lthSopr != null ? onChain.lthSopr.toFixed(3) : '—'}
            </div>
            <div className="text-slate-500">
              {onChain?.lthSopr == null ? '' : onChain.lthSopr < 1 ? 'Vente à perte' : onChain.lthSopr < 1.05 ? 'Neutre' : 'Prise de profit'}
            </div>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="border-t border-bg-border pt-2 flex flex-col gap-1.5">
        <div className="text-xs text-slate-500 mb-1">Décomposition du score BTC</div>
        <MiniGauge label="Prix vs MA200" score={
          scored.components.priceVsMA200
            ? Math.round(Math.min(100, Math.max(0, 50 + (scored.components.priceVsMA200 - 1) * 50)))
            : null
        } />
        <MiniGauge label="RSI 14" score={
          scored.components.rsi14
            ? Math.round(100 - scored.components.rsi14)
            : null
        } />
        <MiniGauge label="Fear & Greed" score={
          scored.components.fearGreed !== null
            ? Math.round(100 - scored.components.fearGreed)
            : null
        } />
        <MiniGauge label="Hashrate 7j" score={
          scored.components.hashrateChange7d !== null
            ? Math.round(50 + scored.components.hashrateChange7d * 5)
            : null
        } />
        <MiniGauge label="MVRV Z" score={
          scored.components.mvrvZscore !== null
            ? Math.round(Math.max(0, Math.min(100, 90 - scored.components.mvrvZscore * 12)))
            : null
        } />
        <MiniGauge label="LTH NUPL" score={
          scored.components.nuplLth !== null
            ? Math.round(Math.max(0, Math.min(100, 90 - scored.components.nuplLth * 100)))
            : null
        } />
        <MiniGauge label="LTH SOPR" score={
          scored.components.lthSopr !== null
            ? Math.round(Math.max(0, Math.min(100, 100 - (scored.components.lthSopr - 0.95) * 200)))
            : null
        } />
      </div>
    </div>
  )
}
