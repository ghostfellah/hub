import axios from 'axios'
import { cacheGet, cacheSet } from './cache.js'

const COINGECKO = 'https://api.coingecko.com/api/v3'
const MEMPOOL = 'https://mempool.space/api'
const FEAR_GREED = 'https://api.alternative.me/fng'
const BTCDATA = '/api/btcdata/v1'

// TTLs
const TTL_PRICE = 3 * 60 * 1000      // 3 min
const TTL_HISTORY = 30 * 60 * 1000   // 30 min
const TTL_ONCHAIN = 10 * 60 * 1000   // 10 min
const TTL_FNG = 15 * 60 * 1000       // 15 min
const TTL_BTCDATA = 2 * 60 * 60 * 1000 // 2h (free plan: 8 req/h, 15/day)

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

async function get(url, params = {}) {
  const { data } = await axios.get(url, { params, timeout: 10000 })
  return data
}

// ── RSI Calculation ──────────────────────────────────────
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 2) return null
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1]
    d >= 0 ? (gains += d) : (losses -= d)
  }
  let avgGain = gains / period
  let avgLoss = losses / period
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period
  }
  if (avgLoss === 0) return 100
  return 100 - 100 / (1 + avgGain / avgLoss)
}

function calculateSMA(prices, period) {
  if (prices.length < period) return null
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

// ── Market Data ──────────────────────────────────────────
export async function fetchBitcoinMarket() {
  const cached = cacheGet('btc_market')
  if (cached) return cached

  const data = await get(`${COINGECKO}/coins/bitcoin`, {
    localization: false,
    tickers: false,
    market_data: true,
    community_data: false,
    developer_data: false,
  })

  const md = data.market_data
  const result = {
    price: md.current_price.usd,
    change24h: md.price_change_percentage_24h,
    change7d: md.price_change_percentage_7d,
    change30d: md.price_change_percentage_30d,
    marketCap: md.market_cap.usd,
    volume24h: md.total_volume.usd,
    ath: md.ath.usd,
    athDate: md.ath_date.usd,
    high24h: md.high_24h.usd,
    low24h: md.low_24h.usd,
    circulatingSupply: md.circulating_supply,
  }

  cacheSet('btc_market', result, TTL_PRICE)
  return result
}

// ── Historical Prices (200 days for MA + RSI) ─────────────
export async function fetchBitcoinHistory() {
  const cached = cacheGet('btc_history')
  if (cached) return cached

  const data = await get(`${COINGECKO}/coins/bitcoin/market_chart`, {
    vs_currency: 'usd',
    days: 200,
    interval: 'daily',
  })

  // prices = [[timestamp, price], ...]
  const prices = data.prices.map(([ts, p]) => ({ ts, price: p }))
  const closeArr = prices.map((p) => p.price)

  const ma200 = calculateSMA(closeArr, 200)
  const ma50 = calculateSMA(closeArr, 50)
  const rsi14 = calculateRSI(closeArr, 14)

  // Volume average (30 days)
  const volumes = data.total_volumes.slice(-30).map(([, v]) => v)
  const avgVolume30d = volumes.reduce((a, b) => a + b, 0) / volumes.length

  // Sparkline (last 30 days)
  const sparkline = prices.slice(-30).map((p, i) => ({ i, price: p.price }))

  const result = { prices, ma200, ma50, rsi14, avgVolume30d, sparkline }
  cacheSet('btc_history', result, TTL_HISTORY)
  return result
}

// ── Fear & Greed Index ───────────────────────────────────
export async function fetchFearGreed() {
  const cached = cacheGet('fear_greed')
  if (cached) return cached

  const data = await get(`${FEAR_GREED}/?limit=30`)
  const list = data.data.map((d) => ({
    value: parseInt(d.value),
    label: d.value_classification,
    ts: parseInt(d.timestamp) * 1000,
  }))

  const result = { current: list[0], history: list }
  cacheSet('fear_greed', result, TTL_FNG)
  return result
}

// ── On-Chain: Hashrate ───────────────────────────────────
export async function fetchHashrate() {
  const cached = cacheGet('hashrate')
  if (cached) return cached

  const data = await get(`${MEMPOOL}/v1/mining/hashrate/3m`)
  const rates = data.hashrates // [{timestamp, avgHashrate}]

  const latest = rates[rates.length - 1]?.avgHashrate ?? null
  const prev7d = rates[rates.length - 8]?.avgHashrate ?? null
  const change7d = latest && prev7d ? ((latest - prev7d) / prev7d) * 100 : null

  const sparkline = rates.slice(-30).map((r, i) => ({
    i,
    value: r.avgHashrate / 1e18, // EH/s
  }))

  const result = {
    current: latest ? latest / 1e18 : null, // EH/s
    change7d,
    sparkline,
  }

  cacheSet('hashrate', result, TTL_ONCHAIN)
  return result
}

// ── On-Chain: Mempool ────────────────────────────────────
export async function fetchMempool() {
  const cached = cacheGet('mempool')
  if (cached) return cached

  const data = await get(`${MEMPOOL}/mempool`)
  const result = {
    txCount: data.count,
    vsize: data.vsize,
    feeHistogram: data.fee_histogram,
  }

  cacheSet('mempool', result, TTL_ONCHAIN)
  return result
}

// ── On-Chain Metrics (bitcoin-data.com) ──────────────────
// Free plan: 8 req/h, 15/day → serialize calls with delays
// Each metric is cached individually so a 429 on one doesn't block others
async function fetchSingleMetric(key, endpoint, field) {
  const cached = cacheGet(`btc_${key}`)
  if (cached !== null) return cached
  try {
    const data = await get(`${BTCDATA}/${endpoint}/1`)
    const value = data?.[field] != null ? parseFloat(data[field]) : null
    cacheSet(`btc_${key}`, value, TTL_BTCDATA)
    return value
  } catch (err) {
    console.warn(`[on-chain] ${key} fetch failed:`, err.message)
    return null
  }
}

export async function fetchOnChainMetrics() {
  // Check if all 3 metrics are still cached
  const cached = cacheGet('btc_onchain_metrics')
  if (cached) return cached

  // Serialize requests with 2s delay to respect rate limits
  const mvrvZscore = await fetchSingleMetric('mvrv', 'mvrv-zscore', 'mvrvZscore')
  await delay(2000)
  const nuplLth = await fetchSingleMetric('nupl', 'nupl-lth', 'nuplLth')
  await delay(2000)
  const lthSopr = await fetchSingleMetric('sopr', 'lth-sopr', 'lthSopr')

  const result = { mvrvZscore, nuplLth, lthSopr }

  // Only cache the combined result if we got at least one value
  if (mvrvZscore !== null || nuplLth !== null || lthSopr !== null) {
    cacheSet('btc_onchain_metrics', result, TTL_BTCDATA)
  }

  return result
}

// ── All Bitcoin Data aggregated ──────────────────────────
export async function fetchAllBitcoin() {
  const [market, history, fearGreed, hashrate, onChain] = await Promise.allSettled([
    fetchBitcoinMarket(),
    fetchBitcoinHistory(),
    fetchFearGreed(),
    fetchHashrate(),
    fetchOnChainMetrics(),
  ])

  return {
    market: market.status === 'fulfilled' ? market.value : null,
    history: history.status === 'fulfilled' ? history.value : null,
    fearGreed: fearGreed.status === 'fulfilled' ? fearGreed.value : null,
    hashrate: hashrate.status === 'fulfilled' ? hashrate.value : null,
    onChain: onChain.status === 'fulfilled' ? onChain.value : null,
  }
}
