import axios from 'axios'
import { cacheGet, cacheSet } from './cache.js'

// Use Vite's dev server proxy to bypass CORS for FRED API
const FRED_BASE = '/api/fred/fred/series/observations'
const TTL = 60 * 60 * 1000 // 1 hour (macro data changes slowly)

// FRED Series IDs
const SERIES = {
  FED_FUNDS: 'FEDFUNDS',       // Effective Federal Funds Rate
  CPI: 'CPIAUCSL',             // CPI All Urban Consumers
  UNEMPLOYMENT: 'UNRATE',      // Unemployment Rate
  YIELD_10Y: 'DGS10',          // 10-Year Treasury Constant Maturity Rate
  YIELD_2Y: 'DGS2',            // 2-Year Treasury Constant Maturity Rate
  M2: 'M2SL',                  // M2 Money Stock
  // Net Liquidity components
  FED_BALANCE_SHEET: 'WALCL',  // Fed Total Assets (weekly, millions $)
  TGA: 'WTREGEN',              // Treasury General Account (weekly, millions $)
  REVERSE_REPO: 'RRPONTSYD',   // Overnight Reverse Repurchase Agreements (daily, billions $)
}

async function fetchFredSeries(seriesId, apiKey, limit = 6) {
  const cacheKey = `fred_${seriesId}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  if (!apiKey) return null

  const { data } = await axios.get(FRED_BASE, {
    params: {
      series_id: seriesId,
      api_key: apiKey,
      limit,
      sort_order: 'desc',
      file_type: 'json',
    },
    timeout: 10000,
  })

  const obs = data.observations
    .filter((o) => o.value !== '.')
    .map((o) => ({ date: o.date, value: parseFloat(o.value) }))

  const result = {
    current: obs[0]?.value ?? null,
    prev: obs[1]?.value ?? null,
    history: obs.reverse(),
    trend: obs.length >= 2 ? getTrend(obs[obs.length - 1].value, obs[obs.length - 2].value) : 'stable',
  }

  cacheSet(cacheKey, result, TTL)
  return result
}

function getTrend(current, prev) {
  if (current > prev * 1.001) return 'rising'
  if (current < prev * 0.999) return 'falling'
  return 'stable'
}

/**
 * Compute Net Liquidity = Fed Balance Sheet - TGA - Reverse Repo
 * WALCL is in millions $, WTREGEN in millions $, RRPONTSYD in billions $
 */
function computeNetLiquidity(fedBS, tga, rrp) {
  if (!fedBS?.current || !tga?.current || !rrp?.current) return null

  // WALCL and WTREGEN are in millions, RRPONTSYD is in billions → convert to millions
  const rrpMillions = rrp.current * 1000
  const rrpPrevMillions = (rrp.prev ?? rrp.current) * 1000

  const current = fedBS.current - tga.current - rrpMillions
  const prev = (fedBS.prev ?? fedBS.current) - (tga.prev ?? tga.current) - rrpPrevMillions

  const trend = getTrend(current, prev)
  const changePercent = prev ? ((current - prev) / Math.abs(prev)) * 100 : 0

  return {
    current,     // in millions $
    prev,
    currentT: (current / 1_000_000).toFixed(2), // in trillions $
    prevT: (prev / 1_000_000).toFixed(2),
    trend,
    changePercent: +changePercent.toFixed(2),
    components: {
      fedBS: fedBS.current,
      tga: tga.current,
      rrp: rrp.current,
    },
  }
}

export async function fetchMacroData(apiKey) {
  if (!apiKey) {
    return {
      fedFunds: null,
      cpi: null,
      unemployment: null,
      yield10y: null,
      yield2y: null,
      m2: null,
      netLiquidity: null,
      error: 'FRED API key required. Get a free key at fred.stlouisfed.org',
    }
  }

  const [fedFunds, cpi, unemployment, yield10y, yield2y, m2, fedBS, tga, rrp] =
    await Promise.allSettled([
      fetchFredSeries(SERIES.FED_FUNDS, apiKey),
      fetchFredSeries(SERIES.CPI, apiKey, 14),
      fetchFredSeries(SERIES.UNEMPLOYMENT, apiKey),
      fetchFredSeries(SERIES.YIELD_10Y, apiKey, 10),
      fetchFredSeries(SERIES.YIELD_2Y, apiKey, 10),
      fetchFredSeries(SERIES.M2, apiKey),
      fetchFredSeries(SERIES.FED_BALANCE_SHEET, apiKey, 4),
      fetchFredSeries(SERIES.TGA, apiKey, 4),
      fetchFredSeries(SERIES.REVERSE_REPO, apiKey, 4),
    ])

  const resolve = (r) => (r.status === 'fulfilled' ? r.value : null)

  const cpiData = resolve(cpi)
  // CPI YoY: (current / 12mo_ago - 1) * 100
  let cpiYoY = null
  if (cpiData?.history?.length >= 12) {
    const h = cpiData.history
    cpiYoY = ((h[h.length - 1].value / h[h.length - 13]?.value - 1) * 100).toFixed(2)
  }

  const y10 = resolve(yield10y)
  const y2 = resolve(yield2y)
  const yieldSpread = y10?.current && y2?.current ? (y10.current - y2.current).toFixed(2) : null

  // Net Liquidity
  const netLiquidity = computeNetLiquidity(resolve(fedBS), resolve(tga), resolve(rrp))

  return {
    fedFunds: resolve(fedFunds),
    cpi: cpiData ? { ...cpiData, yoY: cpiYoY } : null,
    unemployment: resolve(unemployment),
    yield10y: y10,
    yield2y: y2,
    yieldSpread, // negative = inverted curve
    m2: resolve(m2),
    netLiquidity,
    error: null,
  }
}
