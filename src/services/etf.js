import axios from 'axios'
import { cacheGet, cacheSet } from './cache.js'

// Use local Vite proxy to avoid CORS issues with Yahoo Finance
const YF_PROXY = '/api/yahoo/v8/finance/chart'

const TTL = 20 * 60 * 1000 // 20 min

const BTC_ETFS = [
  { symbol: 'IBIT', name: 'iShares Bitcoin Trust (BlackRock)', color: '#3b82f6' },
  { symbol: 'FBTC', name: 'Fidelity Wise Origin Bitcoin Fund', color: '#a855f7' },
  { symbol: 'BITB', name: 'Bitwise Bitcoin ETF', color: '#22c55e' },
  { symbol: 'ARKB', name: 'ARK 21Shares Bitcoin ETF', color: '#f59e0b' },
]

async function fetchYahooSeries(symbol, days = 30) {
  const cacheKey = `etf_${symbol}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const url = `${YF_PROXY}/${symbol}?interval=1d&range=${days}d`
  const res = await axios.get(url, { timeout: 15000 })
  const data = res.data
  if (!data) throw new Error(`No response for ${symbol}`)
  const result = data?.chart?.result?.[0]

  if (!result) throw new Error(`No data for ${symbol}`)

  const timestamps = result.timestamp
  const closes = result.indicators.quote[0].close
  const volumes = result.indicators.quote[0].volume

  const series = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      close: closes[i],
      volume: volumes[i],
    }))
    .filter((d) => d.close !== null)

  // Estimate daily net flows: price change * avg shares outstanding (approximation)
  // Real flow = ETF AUM change. Without AUM data, use vol * price as proxy.
  const latestClose = series[series.length - 1]?.close ?? null
  const prevClose = series[series.length - 2]?.close ?? null
  const change1d = latestClose && prevClose ? ((latestClose - prevClose) / prevClose) * 100 : null

  // 7-day flow proxy: (last price - price 7d ago) / price 7d ago * 100
  const price7dAgo = series[series.length - 8]?.close ?? null
  const change7d = latestClose && price7dAgo ? ((latestClose - price7dAgo) / price7dAgo) * 100 : null

  const sparkline = series.slice(-14).map((d, i) => ({ i, price: d.close }))

  const parsed = {
    symbol,
    price: latestClose,
    change1d,
    change7d,
    sparkline,
    series,
  }

  cacheSet(cacheKey, parsed, TTL)
  return parsed
}

export async function fetchAllETFs() {
  const results = await Promise.allSettled(
    BTC_ETFS.map((etf) => fetchYahooSeries(etf.symbol))
  )

  return BTC_ETFS.map((etf, i) => ({
    ...etf,
    data: results[i].status === 'fulfilled' ? results[i].value : null,
    error: results[i].status === 'rejected' ? results[i].reason?.message : null,
  }))
}

// Also fetch SPY, GLD, UUP for macro context
export async function fetchMacroAssets() {
  const symbols = ['SPY', 'GLD', 'UUP']
  const results = await Promise.allSettled(symbols.map((s) => fetchYahooSeries(s, 60)))
  return {
    spy: results[0].status === 'fulfilled' ? results[0].value : null,
    gld: results[1].status === 'fulfilled' ? results[1].value : null,
    uup: results[2].status === 'fulfilled' ? results[2].value : null,
  }
}
