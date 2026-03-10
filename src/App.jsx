import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header.jsx'
import Settings from './components/Settings.jsx'
import ScoreGauge from './components/ScoreGauge.jsx'
import BitcoinPanel from './components/panels/BitcoinPanel.jsx'
import ETFPanel from './components/panels/ETFPanel.jsx'
import MacroPanel from './components/panels/MacroPanel.jsx'
import NewsPanel from './components/panels/NewsPanel.jsx'
import DecisionPanel from './components/DecisionPanel.jsx'

import { fetchAllBitcoin } from './services/bitcoin.js'
import { fetchAllETFs, fetchMacroAssets } from './services/etf.js'
import { fetchMacroData } from './services/macro.js'
import { fetchNews } from './services/news.js'

import {
  scoreBTC,
  scoreETF,
  scoreMacro,
  scoreNews,
  computeGlobalScore,
  getSignal,
  getScoreColor,
} from './utils/scoring.js'

const KEYS_STORAGE = 'finhub_api_keys'
const AUTO_REFRESH_MS = 5 * 60 * 1000 // 5 min

const ENV_DEFAULTS = {
  FRED_API_KEY: import.meta.env.VITE_FRED_API_KEY || '',
  AV_API_KEY: import.meta.env.VITE_AV_API_KEY || '',
  CRYPTOPANIC_KEY: import.meta.env.VITE_CRYPTOPANIC_KEY || '',
}

function loadKeys() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEYS_STORAGE)) || {}
    // Merge: localStorage overrides env, but env fills missing keys
    return {
      FRED_API_KEY: stored.FRED_API_KEY || ENV_DEFAULTS.FRED_API_KEY,
      AV_API_KEY: stored.AV_API_KEY || ENV_DEFAULTS.AV_API_KEY,
      CRYPTOPANIC_KEY: stored.CRYPTOPANIC_KEY || ENV_DEFAULTS.CRYPTOPANIC_KEY,
    }
  } catch {
    return ENV_DEFAULTS
  }
}

function saveKeys(keys) {
  localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys))
}

export default function App() {
  const [apiKeys, setApiKeys] = useState(loadKeys)
  const [showSettings, setShowSettings] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [loading, setLoading] = useState(false)

  // Data state
  const [btcData, setBtcData] = useState(null)
  const [etfList, setEtfList] = useState([])
  const [macroData, setMacroData] = useState(null)
  const [macroAssets, setMacroAssets] = useState(null)
  const [newsData, setNewsData] = useState(null)
  const [errors, setErrors] = useState({})

  // ── Scoring ──────────────────────────────────────────────
  const btcScored = btcData ? scoreBTC(btcData) : { score: null }
  const etfScored = etfList?.length ? scoreETF(etfList) : { score: null }
  const macroScored = scoreMacro(macroData, macroAssets)
  const newsScored = newsData ? scoreNews(newsData) : { score: null }
  const globalScore = computeGlobalScore(
    btcScored.score,
    etfScored.score,
    macroScored.score,
    newsScored.score,
  )

  const scores = {
    btc: btcScored.score,
    etf: etfScored.score,
    macro: macroScored.score,
    news: newsScored.score,
    global: globalScore,
  }

  // ── Fetch all ─────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    const errs = {}

    const results = await Promise.allSettled([
      fetchAllBitcoin(),
      fetchAllETFs(),
      fetchMacroAssets(),
      fetchMacroData(apiKeys.FRED_API_KEY || ''),
      fetchNews(apiKeys.CRYPTOPANIC_KEY || ''),
    ])

    const [btcR, etfR, assetsR, macroR, newsR] = results

    if (btcR.status === 'fulfilled') setBtcData(btcR.value)
    else errs.btc = btcR.reason?.message

    if (etfR.status === 'fulfilled') setEtfList(etfR.value)
    else errs.etf = etfR.reason?.message

    if (assetsR.status === 'fulfilled') setMacroAssets(assetsR.value)
    else errs.assets = assetsR.reason?.message

    if (macroR.status === 'fulfilled') setMacroData(macroR.value)
    else errs.macro = macroR.reason?.message

    if (newsR.status === 'fulfilled') setNewsData(newsR.value)
    else errs.news = newsR.reason?.message

    setErrors(errs)
    setLastUpdate(new Date())
    setLoading(false)
  }, [apiKeys])

  // Initial load
  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Auto-refresh
  useEffect(() => {
    const id = setInterval(fetchAll, AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [fetchAll])

  // Open settings on first run only if no FRED key at all (neither .env nor localStorage)
  useEffect(() => {
    const hasAnyKey = apiKeys.FRED_API_KEY || ENV_DEFAULTS.FRED_API_KEY
    if (!hasAnyKey) {
      const t = setTimeout(() => setShowSettings(true), 1500)
      return () => clearTimeout(t)
    }
  }, []) // eslint-disable-line

  const handleSaveKeys = (keys) => {
    setApiKeys(keys)
    saveKeys(keys)
  }

  const signal = getSignal(globalScore)
  const scoreColor = getScoreColor(globalScore)

  return (
    <div className="min-h-screen bg-bg-base text-slate-200">
      <Header
        lastUpdate={lastUpdate}
        loading={loading}
        onRefresh={fetchAll}
        onOpenSettings={() => setShowSettings(true)}
      />

      {showSettings && (
        <Settings
          keys={apiKeys}
          onSave={handleSaveKeys}
          onClose={() => setShowSettings(false)}
        />
      )}

      <main className="max-w-screen-2xl mx-auto px-4 py-5 flex flex-col gap-5">
        {/* ── Score Summary Row ─────────────────────────────── */}
        <div className="bg-bg-card border border-bg-border rounded-lg p-4">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Main gauge */}
            <ScoreGauge score={globalScore} />

            {/* Sub-scores */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
              {[
                { label: 'Bitcoin', score: scores.btc, weight: '40%', color: '#f59e0b' },
                { label: 'ETF Flows', score: scores.etf, weight: '20%', color: '#a855f7' },
                { label: 'Macro', score: scores.macro, weight: '30%', color: '#22c55e' },
                { label: 'Actualités', score: scores.news, weight: '10%', color: '#3b82f6' },
              ].map(({ label, score, weight, color }) => (
                <div key={label} className="bg-bg-base rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className="text-xs text-slate-600">{weight}</span>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: getScoreColor(score) }}>
                    {score ?? '—'}
                    <span className="text-xs text-slate-600 font-normal">/100</span>
                  </div>
                  <div className="h-1 bg-bg-border rounded-full">
                    <div
                      className="h-1 rounded-full transition-all duration-700"
                      style={{ width: `${score ?? 0}%`, background: color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Signal + action */}
            <div
              className="flex flex-col items-center gap-2 min-w-[200px] p-4 rounded-lg border"
              style={{ borderColor: scoreColor + '40', background: scoreColor + '0a' }}
            >
              <div className="text-3xl">{signal.emoji}</div>
              <div className="font-bold text-sm tracking-widest text-center" style={{ color: scoreColor }}>
                {signal.label}
              </div>
              <div className="text-xs text-slate-400 text-center leading-snug max-w-[180px]">
                {signal.action}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Panels Grid ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <BitcoinPanel btcData={btcData} loading={loading} />
          <ETFPanel etfList={etfList} loading={loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <MacroPanel macroData={macroData} macroAssets={macroAssets} loading={loading} />
          <NewsPanel newsData={newsData} loading={loading} />
        </div>

        {/* ── Decision Workflow ─────────────────────────────── */}
        <DecisionPanel scores={scores} btcComponents={btcScored.components} />

        {/* ── Errors ───────────────────────────────────────── */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-3 text-xs text-red-400">
            <div className="font-semibold mb-1">Avertissements API :</div>
            {Object.entries(errors).map(([k, v]) => (
              <div key={k}>{k}: {v}</div>
            ))}
          </div>
        )}

        <footer className="text-center text-xs text-slate-700 pb-4">
          Financial Hub v1.0 · Données: CoinGecko, Mempool.space, Alternative.me, FRED, Yahoo Finance, RSS
          <br />
          Actualisation automatique toutes les 5 minutes · {lastUpdate?.toLocaleString('fr-FR') ?? '—'}
        </footer>
      </main>
    </div>
  )
}
